const API_BASE = 'https://able-n6du.onrender.com';

(function initTheme(){
  const saved = localStorage.getItem('able_theme');
  document.documentElement.dataset.theme = saved === 'light' ? 'light' : 'dark';
})();

(function injectSharedStyles(){
  const style = document.createElement('style');
  style.textContent = `
    .theme-toggle{width:38px;height:38px;border:1px solid #30343d;background:#15181d;color:#f3f5f8;border-radius:10px;font-size:17px;display:grid;place-items:center;padding:0;line-height:1;}
    .theme-toggle:hover{background:#22262d;transform:translateY(-1px)}
    .contest-problem,.article-paper,.problem-detail,.problem-solution{background:transparent!important;box-shadow:none!important}
    .contest-problem+.contest-problem{border-top:0!important;margin-top:8px}
    .contest-problem{padding:38px 0!important}
    .contest-problem-heading span{border:0!important;background:transparent!important;padding:0!important;min-width:0!important;height:auto!important;font-size:21px!important;letter-spacing:.5px}
    .detail-divider{height:1px;background:rgba(255,255,255,.12);margin:42px 0}
    .solution-reveal{margin-top:38px;padding-top:0}
    .solution-reveal .btn{font-size:14px}
    .solution-content{display:none;margin-top:30px;padding-top:28px;border-top:1px solid rgba(255,255,255,.12)}
    .solution-content.open{display:block}
    .drive-submit{margin-top:38px;padding-top:28px;border-top:1px solid rgba(255,255,255,.12)}
    .drive-submit a{display:inline-flex;align-items:center;gap:8px}
    .exam-print-header{display:none}
    .print-answer-space{display:none}
    html[data-theme="light"] body{background:#f7f7f5!important;color:#15171a!important}
    html[data-theme="light"] .top{background:rgba(247,247,245,.88)!important;border-bottom-color:#dedfdd!important}
    html[data-theme="light"] .navlinks{color:#656a72}
    html[data-theme="light"] .navlinks a:hover,html[data-theme="light"] .navlinks a.active{color:#111!important}
    html[data-theme="light"] .brand{color:#111}
    html[data-theme="light"] .theme-toggle{background:#fff;color:#16181b;border-color:#d5d7d5}
    html[data-theme="light"] .btn{background:#fff;color:#17191c;border-color:#d3d5d8}
    html[data-theme="light"] .btn:hover{background:#f0f1f2}
    html[data-theme="light"] .btn.primary{background:#17191c;color:#fff;border-color:#17191c}
    html[data-theme="light"] .btn.primary:hover{background:#000}
    html[data-theme="light"] .pagehero,html[data-theme="light"] .contest-hero{background:radial-gradient(circle at 80% 0,rgba(110,120,220,.10),transparent 30%),#f7f7f5!important;border-bottom-color:#dedfdd!important}
    html[data-theme="light"] .section,html[data-theme="light"] .contest-page,html[data-theme="light"] .article-page{background:#f7f7f5!important}
    html[data-theme="light"] .pagehero h1,html[data-theme="light"] .contest-hero h1,html[data-theme="light"] .article-paper,html[data-theme="light"] .question-text,html[data-theme="light"] .problem-number{color:#17191c!important}
    html[data-theme="light"] .lead,html[data-theme="light"] .card p,html[data-theme="light"] .exam-card p,html[data-theme="light"] .small,html[data-theme="light"] .article-paper p{color:#626770!important}
    html[data-theme="light"] .card,html[data-theme="light"] .exam-card,html[data-theme="light"] .bigcard,html[data-theme="light"] .admin-side,html[data-theme="light"] .admin-main,html[data-theme="light"] .editor-card,html[data-theme="light"] .authbox{background:#fff!important;border-color:#dedfe2!important;box-shadow:0 12px 35px rgba(0,0,0,.05)}
    html[data-theme="light"] .input,html[data-theme="light"] .select,html[data-theme="light"] .textarea{background:#fff!important;color:#17191c!important;border-color:#d4d7da!important}
    html[data-theme="light"] .footer{background:#f7f7f5!important;border-top-color:#dedfdd!important}
    html[data-theme="light"] .footlinks{color:#666b73}
    html[data-theme="light"] .rows,html[data-theme="light"] .row,html[data-theme="light"] .history-list,html[data-theme="light"] .history-row{border-color:#dedfe2!important}
    html[data-theme="light"] .contest-problem+.contest-problem,html[data-theme="light"] .detail-divider,html[data-theme="light"] .solution-content,html[data-theme="light"] .drive-submit{border-color:#d9dbde!important}
    html[data-theme="light"] .tag,html[data-theme="light"] .eyebrow{color:#70757e!important}
    html[data-theme="light"] .exam-screen{background:#f7f7f5!important;color:#17191c!important}
    html[data-theme="light"] .exam-top{background:rgba(255,255,255,.94)!important;border-color:#d9dbdf!important}
    html[data-theme="light"] .exam-top h1,html[data-theme="light"] .exam-paper-title h2{color:#17191c!important}
    html[data-theme="light"] .exam-clock{color:#17191c}
    html[data-theme="light"] .exam-question{border-bottom-color:#dedfe2!important}
    @media print{
      body{background:#fff!important;color:#111!important}
      .top,.footer,.exam-actions,.contest-actions,.article-actions,.btn,.theme-toggle{display:none!important}
      .exam-screen{padding:0!important;background:#fff!important}
      .exam-top{position:static!important;display:block!important;border:0!important;background:#fff!important;padding:0 0 18px!important}
      .exam-top h1{color:#111!important;font-size:30px!important;margin:8px 0!important}
      .exam-label{color:#555!important}
      .exam-clock{display:none!important}
      .exam-print-header{display:block!important;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;letter-spacing:2px;margin-bottom:4px}
      .exam-paper{width:100%!important;margin:25px 0!important}
      .exam-paper-title{margin-bottom:35px!important}
      .exam-paper-title h2,.exam-paper-title p,.problem-number,.question-text{color:#111!important}
      .exam-question{break-inside:avoid;border-bottom:0!important;padding:28px 0!important}
      .question-text{font-size:17px!important;line-height:1.75!important}
      .print-answer-space{display:block!important;height:145px;border-bottom:1px solid #aaa;margin-top:24px}
      .contest-page,.article-page{background:#fff!important;color:#111!important}
    }
  `;
  document.head.appendChild(style);
})();

async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const r = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  let d = {};
  try { d = await r.json(); } catch {}
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

function toggleTheme(){
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('able_theme', next);
  const b = document.getElementById('theme-toggle');
  if (b) {
    b.textContent = next === 'light' ? '☾' : '☀';
    b.title = next === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    b.setAttribute('aria-label', b.title);
  }
}

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

async function me() {
  try { return (await api('/api/me')).user; } catch { return null; }
}

async function logout() {
  try { await api('/api/logout', { method:'POST' }); }
  finally { location.href = '/'; }
}

async function requireUser() {
  const u = await me();
  if (!u) { location.href = '/login.html'; return null; }
  return u;
}

async function requireAdmin() {
  const u = await me();
  if (!u || u.role !== 'admin') { location.href = '/login.html'; return null; }
  return u;
}

function escapeHtml(x = '') {
  return String(x).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function nav(active) {
  const links = [
    ['Problems','/problems.html'], ['Contests','/contests.html'],
    ['Articles','/articles.html'], ['Exams','/exams.html'], ['About','/about.html']
  ];
  const light = document.documentElement.dataset.theme === 'light';
  return `<header class="top"><div class="wrap nav"><a class="brand" href="/">ABLE</a><nav class="navlinks">${links.map(x => `<a class="${active===x[0]?'active':''}" href="${x[1]}">${x[0]}</a>`).join('')}</nav><div class="actions" id="nav-actions"><button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" aria-label="${light?'Switch to dark mode':'Switch to light mode'}" title="${light?'Switch to dark mode':'Switch to light mode'}">${light?'☾':'☀'}</button><a class="btn ghost" href="/login.html">Login</a><a class="btn primary" href="/signup.html">Join Us</a></div></div></header>`;
}

async function updateNavUser() {
  const box = document.getElementById('nav-actions');
  if (!box) return;
  const u = await me();
  if (!u) return;
  const light = document.documentElement.dataset.theme === 'light';
  box.innerHTML = `<button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" aria-label="${light?'Switch to dark mode':'Switch to light mode'}" title="${light?'Switch to dark mode':'Switch to light mode'}">${light?'☾':'☀'}</button><a class="btn ghost" href="/account.html">${escapeHtml(u.name)}</a>${u.role==='admin'?'<a class="btn" href="/admin.html">Admin</a>':''}<button class="btn primary" onclick="logout()">Log out</button>`;
}

function shell(active, title, body) {
  document.title = `ABLE — ${title}`;
  document.body.innerHTML = nav(active) + body + footer();
  updateNavUser();
}

function footer() {
  return `<footer class="footer"><div class="wrap footgrid"><div><div class="brand">ABLE</div><div class="small">Olympiad mathematics for serious problem solvers.</div></div><div class="footlinks"><a href="/problems.html">Problems</a><a href="/contests.html">Contests</a><a href="/articles.html">Articles</a><a href="/exams.html">Exams</a><a href="/about.html">About Us</a></div></div></footer>`;
}
