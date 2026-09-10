import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT || 4173);
const DATA_DIR = join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'db.json');
const sessions = new Map();
const categories = ['IMPERATIVE', 'FULL-STACK', 'ARCHITECTURE'];
const id = () => randomBytes(8).toString('hex');
const code = () => `CYW-${randomBytes(3).toString('hex').toUpperCase()}`;
const hash = (password, salt = randomBytes(16).toString('hex')) => `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
const verify = (password, stored) => { const [salt, digest] = stored.split(':'); return timingSafeEqual(Buffer.from(digest, 'hex'), scryptSync(password, salt, 32)); };

async function load() { try { return JSON.parse(await readFile(DB_FILE, 'utf8')); } catch { return seed(); } }
async function save(db) { await mkdir(DATA_DIR, { recursive: true }); await writeFile(DB_FILE, JSON.stringify(db, null, 2)); }
async function seed() {
  const users = [
    { id: id(), name: 'Admin User', email: 'admin@cyw.dev', password: hash('admin123'), role: 'admin' },
    { id: id(), name: 'Alex Morgan', email: 'alex@cyw.dev', password: hash('student123'), role: 'student' },
    { id: id(), name: 'Sam Kim', email: 'sam@cyw.dev', password: hash('student123'), role: 'student' },
    { id: id(), name: 'Jamie Reed', email: 'jamie@cyw.dev', password: hash('student123'), role: 'student' }
  ];
  const projects = [{ id: id(), title: 'Command-line habit tracker', category: 'IMPERATIVE', order: 1, active: true, markdown: '# Command-line habit tracker\n\nBuild a CLI that records habits and reports streaks.\n\n## Requirements\n\n- Parse commands and flags\n- Add and remove habits\n- Persist data between runs\n- Include automated tests' }];
  const db = { users, projects, submissions: [], auditAssignments: [], audits: [] }; await save(db); return db;
}
const json = (res, status, body, extra = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...extra }); res.end(JSON.stringify(body)); };
const body = async (req) => { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 2_000_000) throw Error('Request too large'); } return raw ? JSON.parse(raw) : {}; };
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(v => v.trim().split('=')));
const publicUser = ({ password, ...user }) => user;
const currentUser = (req, db) => db.users.find(u => u.id === sessions.get(cookies(req).cyw_session));
const eligible = (db, project, userId) => {
  const ordered = db.projects.filter(p => p.active).sort((a,b) => categories.indexOf(a.category)-categories.indexOf(b.category) || a.order-b.order);
  const index = ordered.findIndex(p => p.id === project.id); if (index <= 0) return true;
  return db.submissions.some(s => s.userId === userId && s.projectId === ordered[index-1].id && s.status === 'passed');
};

async function api(req, res, url, db) {
  if (req.method === 'POST' && url.pathname === '/api/login') { const data = await body(req); const user = db.users.find(u => u.email.toLowerCase() === String(data.email).toLowerCase()); if (!user || !verify(data.password || '', user.password)) return json(res, 401, { error: 'Invalid email or password' }); const token = randomBytes(24).toString('hex'); sessions.set(token, user.id); return json(res, 200, { user: publicUser(user) }, { 'set-cookie': `cyw_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400` }); }
  if (req.method === 'POST' && url.pathname === '/api/logout') { sessions.delete(cookies(req).cyw_session); return json(res, 200, { ok: true }, { 'set-cookie': 'cyw_session=; HttpOnly; Path=/; Max-Age=0' }); }
  const user = currentUser(req, db); if (!user) return json(res, 401, { error: 'Authentication required' });
  if (req.method === 'GET' && url.pathname === '/api/me') return json(res, 200, { user: publicUser(user) });
  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    const projects = db.projects.filter(p => p.active).sort((a,b) => categories.indexOf(a.category)-categories.indexOf(b.category) || a.order-b.order).map(p => ({ ...p, unlocked: eligible(db,p,user.id), submission: db.submissions.find(s => s.projectId === p.id && s.userId === user.id) || null }));
    const assignments = db.auditAssignments.filter(a => a.auditorId === user.id && a.status === 'pending').map(a => ({ ...a, submission: db.submissions.find(s => s.id === a.submissionId), project: db.projects.find(p => p.id === db.submissions.find(s => s.id === a.submissionId)?.projectId), student: publicUser(db.users.find(u => u.id === db.submissions.find(s => s.id === a.submissionId)?.userId)) }));
    return json(res, 200, { user: publicUser(user), projects, assignments, categories });
  }
  if (req.method === 'POST' && url.pathname.match(/^\/api\/projects\/[^/]+\/submit$/)) { const projectId = url.pathname.split('/')[3]; const project = db.projects.find(p => p.id === projectId && p.active); if (!project || !eligible(db,project,user.id)) return json(res, 403, { error: 'Project is locked or unavailable' }); if (db.submissions.some(s => s.projectId === projectId && s.userId === user.id && s.status !== 'failed')) return json(res, 409, { error: 'Project already submitted' }); const data = await body(req); if (!data.repository) return json(res, 400, { error: 'Repository URL is required' }); const submission = { id:id(), projectId, userId:user.id, repository:data.repository, status:'in_audit', createdAt:new Date().toISOString() }; db.submissions.push(submission); const auditors = db.users.filter(u => u.role === 'student' && u.id !== user.id).sort(() => Math.random()-.5).slice(0,2); for (const auditor of auditors) db.auditAssignments.push({ id:id(), submissionId:submission.id, auditorId:auditor.id, code:code(), status:'pending' }); await save(db); return json(res, 201, { submission, auditors: auditors.length }); }
  if (req.method === 'POST' && url.pathname.match(/^\/api\/audits\/[^/]+$/)) { const assignment = db.auditAssignments.find(a => a.id === url.pathname.split('/')[3] && a.auditorId === user.id); const data = await body(req); if (!assignment || assignment.status !== 'pending') return json(res, 404, { error:'Audit assignment not found' }); if (data.code !== assignment.code) return json(res, 403, { error:'Incorrect audit code' }); if (![0,1,2,3,4,5].includes(Number(data.score)) || !data.feedback?.trim()) return json(res,400,{ error:'Score and feedback are required' }); assignment.status='complete'; db.audits.push({ id:id(), assignmentId:assignment.id, score:Number(data.score), feedback:data.feedback.trim(), createdAt:new Date().toISOString() }); const related=db.auditAssignments.filter(a=>a.submissionId===assignment.submissionId); if(related.length>=2 && related.every(a=>a.status==='complete')) { const scores=related.map(a=>db.audits.find(x=>x.assignmentId===a.id)?.score||0); db.submissions.find(s=>s.id===assignment.submissionId).status=scores.every(s=>s>=3)?'passed':'failed'; } await save(db); return json(res,201,{ok:true}); }
  if (url.pathname === '/api/admin/projects') { if (user.role !== 'admin') return json(res,403,{error:'Admin access required'}); if(req.method==='POST'){ const data=await body(req); if(!data.title || !categories.includes(data.category) || !data.markdown) return json(res,400,{error:'Title, category and Markdown file content are required'}); const project={id:id(),title:data.title.trim(),category:data.category,order:Number(data.order)||1,markdown:data.markdown,active:true}; db.projects.push(project); await save(db); return json(res,201,{project}); } }
  if (req.method === 'DELETE' && url.pathname.match(/^\/api\/admin\/projects\/[^/]+$/)) { if(user.role!=='admin') return json(res,403,{error:'Admin access required'}); const project=db.projects.find(p=>p.id===url.pathname.split('/')[4]); if(!project)return json(res,404,{error:'Project not found'}); project.active=false; await save(db); return json(res,200,{ok:true}); }
  return json(res, 404, { error: 'Not found' });
}

const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'};
http.createServer(async (req,res)=>{ try { const url=new URL(req.url,`http://${req.headers.host}`); const db=await load(); if(url.pathname.startsWith('/api/')) return await api(req,res,url,db); const path=normalize(url.pathname==='/'?'index.html':url.pathname.slice(1)); if(path.startsWith('..')) return res.end(); const file=await readFile(join(process.cwd(),path)); res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'}); res.end(file); } catch(error) { if(error.code==='ENOENT') return json(res,404,{error:'Not found'}); console.error(error); json(res,500,{error:'Server error'}); } }).listen(PORT,()=>console.log(`Code Your World running at http://localhost:${PORT}`));
