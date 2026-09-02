const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const PUBLIC = ROOT;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function setCorsHeaders(res, req) {
  const origin = req?.headers?.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const seed = {
  users: [],
  problems: [
    { id:'p1', title:'Find all functions f : R → R satisfying a functional equation', topic:'Functional Equations', difficulty:'Olympiad', source:'ABLE Sample', status:'published', statement:'Add the full problem statement in Admin.', solution:'Add the solution in Admin.' },
    { id:'p2', title:'A divisibility problem with hidden valuation structure', topic:'Number Theory', difficulty:'Hard', source:'ABLE Sample', status:'published' },
    { id:'p3', title:'The circle configuration that collapses under inversion', topic:'Geometry', difficulty:'Hard', source:'ABLE Sample', status:'published' }
  ],
  articles: [
    { id:'a1', title:'Lambda Substitution', category:'Functional Equations', excerpt:'A recurring technique for functional equations on R+ and beyond.', body:'Lambda substitution is one of the techniques ABLE wants students to recognise and reuse.', status:'published' },
    { id:'a2', title:'Limits in Functional Equations', category:'Methods', excerpt:'When a limit exists, turn it into information about the function.', body:'Study continuity-like consequences, monotonicity and boundedness.', status:'published' },
    { id:'a3', title:'How to Read an Olympiad Problem', category:'Problem Solving', excerpt:'A compact framework for extracting structure before calculating.', body:'Identify objects, invariants, quantifiers and transformations.', status:'published' }
  ],
  contests: [
    { id:'c1', title:'Balkan MO Training', year:'2026', type:'Training Set', description:'A focused collection for Balkan-level preparation.', status:'published', problems:[] },
    { id:'c2', title:'IMO Training Archive', year:'2026', type:'Archive', description:'Curated IMO-style problems and solutions.', status:'published', problems:[] }
  ],
  exams: []
};

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));

function db() {
  const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  d.problems ||= [];
  d.articles ||= [];
  d.contests ||= [];
  d.exams ||= [];
  d.users ||= [];
  d.contests.forEach(c => { c.problems ||= []; });
  d.exams.forEach(e => { e.questions ||= []; e.registrations ||= []; e.submissions ||= []; });
  return d;
}

function save(d) {
  fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));
}

function id(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, key) => e ? reject(e) : resolve(salt + ':' + key.toString('hex'))));
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, key] = String(stored || '').split(':');
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, 64, (e, derived) => {
      if (e) return reject(e);
      resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derived));
    });
  });
}

const sessions = new Map();

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(x => {
    const i = x.indexOf('=');
    return [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1))];
  }));
}

function currentUser(req) {
  const sid = cookies(req).able_session;
  return sid ? sessions.get(sid) : null;
}

function safeUser(u) {
  return { id:u.id, name:u.name, email:u.email, role:u.role, createdAt:u.createdAt };
}

function send(res, req, status, data, type='application/json', extra={}) {
  setCorsHeaders(res, req);
  res.writeHead(status, { 'Content-Type':type, 'Cache-Control':'no-store', ...extra });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => {
      b += c;
      if (b.length > 8e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(b ? JSON.parse(b) : {}); }
      catch (e) { reject(e); }
    });
  });
}

function requireAuth(req, res, admin=false) {
  const u = currentUser(req);
  if (!u) {
    send(res, req, 401, { error:'Authentication required' });
    return null;
  }
  if (admin && u.role !== 'admin') {
    send(res, req, 403, { error:'Admin access required' });
    return null;
  }
  return u;
}

function publicExam(e) {
  return {
    id:e.id,
    title:e.title,
    description:e.description || '',
    date:e.date || '',
    durationMinutes:Number(e.durationMinutes || 60),
    status:e.status || 'Upcoming',
    questions:(e.questions || []).map(q => ({ id:q.id || '', code:q.code || '', statement:q.statement || q.text || '' }))
  };
}

async function api(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  if (req.method === 'GET' && p === '/api/content') {
    const d = db();
    return send(res, req, 200, { problems:d.problems, articles:d.articles, contests:d.contests });
  }

  if (req.method === 'GET' && p === '/api/me') {
    const user = currentUser(req);
    return send(res, req, 200, { user:user ? safeUser(user) : null });
  }

  if (req.method === 'POST' && p === '/api/signup') {
    try {
      const x = await body(req);
      if (!x.name || !x.email || !x.password || x.password.length < 8) return send(res, req, 400, { error:'Name, email and a password of at least 8 characters are required.' });
      const d = db();
      if (d.users.some(v => v.email.toLowerCase() === x.email.toLowerCase())) return send(res, req, 409, { error:'An account with this email already exists.' });
      const user = { id:id('u'), name:String(x.name).trim().slice(0,80), email:String(x.email).trim().toLowerCase(), password:await hashPassword(x.password), role:'user', createdAt:new Date().toISOString() };
      d.users.push(user); save(d);
      const sid = crypto.randomBytes(32).toString('hex');
      sessions.set(sid, safeUser(user));
      return send(res, req, 201, { user:safeUser(user) }, 'application/json', { 'Set-Cookie':`able_session=${sid}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=604800` });
    } catch (e) { console.error(e); return send(res, req, 500, { error:'Could not create account.' }); }
  }

  if (req.method === 'POST' && p === '/api/login') {
    try {
      const x = await body(req), d = db();
      const user = d.users.find(v => v.email.toLowerCase() === String(x.email || '').toLowerCase());
      if (!user || !(await verifyPassword(x.password || '', user.password))) return send(res, req, 401, { error:'Invalid email or password.' });
      const sid = crypto.randomBytes(32).toString('hex');
      sessions.set(sid, safeUser(user));
      return send(res, req, 200, { user:safeUser(user) }, 'application/json', { 'Set-Cookie':`able_session=${sid}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=604800` });
    } catch (e) { console.error(e); return send(res, req, 500, { error:'Login failed.' }); }
  }

  if (req.method === 'POST' && p === '/api/logout') {
    const sid = cookies(req).able_session;
    sessions.delete(sid);
    return send(res, req, 200, { ok:true }, 'application/json', { 'Set-Cookie':'able_session=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure' });
  }

  if (req.method === 'GET' && p === '/api/admin/users') {
    if (!requireAuth(req, res, true)) return;
    const d = db();
    return send(res, req, 200, { users:d.users.map(safeUser) });
  }

  if (req.method === 'GET' && p === '/api/exams') {
    const d = db();
    return send(res, req, 200, { exams:d.exams.map(publicExam) });
  }

  if (req.method === 'GET' && p === '/api/exams/history') {
    const user = requireAuth(req, res);
    if (!user) return;
    const d = db();
    const history = [];
    d.exams.forEach(e => (e.submissions || []).filter(s => s.userId === user.id).forEach(s => history.push({ examId:e.id, title:e.title, submittedAt:s.submittedAt, answers:s.answers || {} })));
    history.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return send(res, req, 200, { history });
  }

  const examMatch = p.match(/^\/api\/exams\/([^/]+)$/);
  if (req.method === 'GET' && examMatch) {
    const d = db(), e = d.exams.find(x => x.id === examMatch[1]);
    if (!e) return send(res, req, 404, { error:'Exam not found' });
    return send(res, req, 200, { exam:publicExam(e) });
  }

  const registerMatch = p.match(/^\/api\/exams\/([^/]+)\/register$/);
  if (req.method === 'POST' && registerMatch) {
    const user = requireAuth(req, res);
    if (!user) return;
    const d = db(), e = d.exams.find(x => x.id === registerMatch[1]);
    if (!e) return send(res, req, 404, { error:'Exam not found' });
    e.registrations ||= [];
    if (!e.registrations.some(r => r.userId === user.id)) e.registrations.push({ userId:user.id, registeredAt:new Date().toISOString() });
    save(d);
    return send(res, req, 200, { ok:true });
  }

  const submitMatch = p.match(/^\/api\/exams\/([^/]+)\/submit$/);
  if (req.method === 'POST' && submitMatch) {
    const user = requireAuth(req, res);
    if (!user) return;
    const d = db(), e = d.exams.find(x => x.id === submitMatch[1]);
    if (!e) return send(res, req, 404, { error:'Exam not found' });
    e.registrations ||= [];
    if (!e.registrations.some(r => r.userId === user.id)) e.registrations.push({ userId:user.id, registeredAt:new Date().toISOString() });
    const x = await body(req);
    e.submissions ||= [];
    e.submissions = e.submissions.filter(s => s.userId !== user.id);
    e.submissions.push({ userId:user.id, userName:user.name, answers:x.answers || {}, startedAt:x.startedAt || null, submittedAt:new Date().toISOString(), reason:x.reason || 'manual' });
    save(d);
    return send(res, req, 200, { ok:true });
  }

  const adminExam = p.match(/^\/api\/admin\/exams(?:\/([^/]+))?$/);
  if (adminExam) {
    if (!requireAuth(req, res, true)) return;
    const d = db(), itemId = adminExam[1];
    if (req.method === 'GET') return send(res, req, 200, d.exams);
    if (req.method === 'POST') {
      const x = await body(req);
      const item = { ...x, id:id('exam'), durationMinutes:Number(x.durationMinutes || 60), questions:Array.isArray(x.questions) ? x.questions : [], registrations:[], submissions:[], createdAt:new Date().toISOString() };
      d.exams.unshift(item); save(d); return send(res, req, 201, item);
    }
    if (req.method === 'PUT' && itemId) {
      const i = d.exams.findIndex(v => v.id === itemId);
      if (i < 0) return send(res, req, 404, { error:'Not found' });
      const x = await body(req);
      d.exams[i] = { ...d.exams[i], ...x, id:itemId, durationMinutes:Number(x.durationMinutes || d.exams[i].durationMinutes || 60), updatedAt:new Date().toISOString() };
      save(d); return send(res, req, 200, d.exams[i]);
    }
    if (req.method === 'DELETE' && itemId) {
      d.exams = d.exams.filter(v => v.id !== itemId); save(d); return send(res, req, 200, { ok:true });
    }
  }

  const contentMatch = p.match(/^\/api\/admin\/(problems|articles|contests)(?:\/([^/]+))?$/);
  if (contentMatch) {
    if (!requireAuth(req, res, true)) return;
    const type = contentMatch[1], itemId = contentMatch[2], d = db();
    if (req.method === 'GET') return send(res, req, 200, d[type]);
    if (req.method === 'POST') {
      const x = await body(req);
      if (type === 'contests') x.problems = Array.isArray(x.problems) ? x.problems : [];
      const item = { ...x, id:id(type.slice(0,-1)), status:x.status || 'published', createdAt:new Date().toISOString() };
      d[type].unshift(item); save(d); return send(res, req, 201, item);
    }
    if (req.method === 'PUT' && itemId) {
      const i = d[type].findIndex(v => v.id === itemId);
      if (i < 0) return send(res, req, 404, { error:'Not found' });
      const x = await body(req);
      d[type][i] = { ...d[type][i], ...x, id:itemId, updatedAt:new Date().toISOString() };
      if (type === 'contests') d[type][i].problems = Array.isArray(d[type][i].problems) ? d[type][i].problems : [];
      save(d); return send(res, req, 200, d[type][i]);
    }
    if (req.method === 'DELETE' && itemId) {
      d[type] = d[type].filter(v => v.id !== itemId); save(d); return send(res, req, 200, { ok:true });
    }
  }

  return send(res, req, 404, { error:'Not found' });
}

function serve(req, res) {
  let file = new URL(req.url, 'http://localhost').pathname;
  if (file === '/') file = '/index.html';
  file = path.normalize(file).replace(/^([.][.][/\\])+/, '');
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) return send(res, req, 403, { error:'Forbidden' });
  fs.readFile(full, (e, data) => {
    if (e) return send(res, req, 404, 'Not found', 'text/plain');
    const ext = path.extname(full);
    const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.json':'application/json' };
    send(res, req, 200, data, types[ext] || 'application/octet-stream', { 'Cache-Control':'no-cache' });
  });
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  req.url.startsWith('/api/') ? api(req,res).catch(e => { console.error(e); send(res,req,500,{error:'Server error'}); }) : serve(req,res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`ABLE running at http://localhost:${PORT}`));

(async () => {
  const d = db();
  if (!d.users.some(u => u.role === 'admin')) {
    const email = process.env.ABLE_ADMIN_EMAIL || 'admin@able.local';
    const password = process.env.ABLE_ADMIN_PASSWORD || 'ChangeMe123!';
    d.users.push({ id:id('u'), name:'ABLE Admin', email, password:await hashPassword(password), role:'admin', createdAt:new Date().toISOString() });
    save(d);
  }
})();