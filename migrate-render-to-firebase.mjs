// One-time migration helper: Render -> Firebase/Firestore.
// Run locally while the Render service is still online.
// Node 18+ required. This script does not save passwords to disk.

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const RENDER = 'https://able-n6du.onrender.com';
const PROJECT = 'able-2ca24';
const API_KEY = 'AIzaSyAjEd4pN33WpoJlT2rsAgDFMO3A4Uh-M4s';

const rl = readline.createInterface({ input, output });
const ask = q => rl.question(q);
const json = async (url, options={}) => {
  const r = await fetch(url, options);
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${text.slice(0,500)}`);
  return data;
};

function fv(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  if (v && typeof v === 'object') {
    const fields = {};
    for (const [k,x] of Object.entries(v)) fields[k] = fv(x);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

async function firebaseAuth(email, password) {
  const sign = async (endpoint) => json(`https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${API_KEY}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email,password,returnSecureToken:true})
  });
  try { return await sign('signInWithPassword'); }
  catch (e) {
    const created = await sign('signUp');
    console.log('Created Firebase admin account:', created.email);
    return created;
  }
}

async function writeDoc(token, collection, id, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`;
  await json(url, {
    method:'PATCH',
    headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,fv(v)]))})
  });
}

async function renderGet(path, cookie) {
  return json(RENDER + path, {headers:{Cookie:cookie}});
}

try {
  console.log('\n=== ABLE: Render -> Firebase migration ===\n');
  console.log('Render must stay online until this finishes.\n');

  const re = await ask('Render admin email: ');
  const rp = await ask('Render admin password: ');
  const fr = await ask('Firebase admin email (new/existing): ');
  const fp = await ask('Firebase admin password: ');

  const login = await json(RENDER + '/api/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:re,password:rp})
  });
  const setCookie = login && login.user ? null : null;
  // Node exposes Set-Cookie through getSetCookie() on modern versions.
  // Re-login request is repeated only if needed to capture the session cookie.
  const lr = await fetch(RENDER + '/api/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:re,password:rp})
  });
  const cookies = typeof lr.headers.getSetCookie === 'function' ? lr.headers.getSetCookie() : [];
  const cookie = cookies.map(x=>x.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Could not obtain Render session cookie. Keep Render online and try again.');

  const fb = await firebaseAuth(fr,fp);
  const token = fb.idToken;
  const uid = fb.localId;

  // Make the Firebase account the ABLE admin for this migration.
  await writeDoc(token,'users',uid,{
    name: fb.displayName || fr.split('@')[0],
    email: fr,
    role: 'admin',
    createdAt: new Date().toISOString()
  });

  const content = await renderGet('/api/content',cookie);
  const admins = {};
  for (const type of ['problems','articles','contests','videos','exams']) {
    const r = await renderGet('/api/admin/'+type,cookie);
    const arr = r[type] || r;
    for (const item of arr) if (item && item.id) await writeDoc(token,type,String(item.id),item);
    console.log(`Migrated ${arr.length} ${type}.`);
  }

  // Preserve public content even if an admin endpoint has a different shape.
  for (const type of ['problems','articles','contests','videos']) {
    for (const item of (content[type] || [])) if (item && item.id) await writeDoc(token,type,String(item.id),item);
  }

  const ur = await renderGet('/api/admin/users',cookie);
  const users = ur.users || [];
  for (const u of users) {
    if (!u || !u.email) continue;
    const id = Buffer.from(u.email).toString('base64url').slice(0,120);
    await writeDoc(token,'legacyUsers',id,{...u,migratedAt:new Date().toISOString()});
  }
  console.log(`Preserved ${users.length} old user profiles in legacyUsers.`);

  console.log('\nMIGRATION COMPLETE.');
  console.log('Firebase admin:', fr);
  console.log('Old user passwords were NOT copied; Firebase cannot safely reuse the old custom password hashes from the public client migration.');
  console.log('Existing users should use Firebase signup/password reset after the migration.');
} catch (e) {
  console.error('\nMIGRATION FAILED:', e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
