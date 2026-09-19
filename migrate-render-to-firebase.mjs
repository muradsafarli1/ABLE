// One-time migration helper: Render -> Firebase/Firestore.
// Uses the protected migration export endpoint; no Render admin login is needed.

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const RENDER = 'https://able-n6du.onrender.com';
const PROJECT = 'able-2ca24';
const API_KEY = 'AIzaSyAjEd4pN33wpoJlT2rsAgDFMO3A4Uh-M4s';

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
  if (typeof v === 'string') {
    if (Buffer.byteLength(v, 'utf8') > 900000) return { nullValue: null };
    return { stringValue: v };
  }
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
  const sign = async endpoint => json(
    `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${API_KEY}`,
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password,returnSecureToken:true})
    }
  );

  try {
    return await sign('signInWithPassword');
  } catch {
    const created = await sign('signUp');
    console.log('Created Firebase admin account:', created.email);
    return created;
  }
}

async function writeDoc(token, collection, id, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`;
  await json(url, {
    method:'PATCH',
    headers:{
      'Authorization':`Bearer ${token}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      fields:Object.fromEntries(
        Object.entries(data).map(([k,v])=>[k,fv(v)])
      )
    })
  });
}

try {
  console.log('\n=== ABLE: Render -> Firebase migration ===\n');
  console.log('Render must stay online until this finishes.\n');

  const key = await ask('Migration key: ');
  const fr = await ask('Firebase admin email: ');
  const fp = await ask('Firebase admin password: ');

  console.log('\nReading old ABLE data from Render...');

  const exported = await json(
    RENDER + '/api/migration/export',
    {headers:{'x-migration-key':key}}
  );

  const fb = await firebaseAuth(fr,fp);
  const token = fb.idToken;
  const uid = fb.localId;

  await writeDoc(token,'users',uid,{
    name: fb.displayName || fr.split('@')[0],
    email: fr,
    role: 'admin',
    createdAt: new Date().toISOString()
  });

  const types = ['problems','articles','contests','videos','exams'];

  for (const type of types) {
    const arr = exported[type] || [];
    for (const item of arr) {
      if (item && item.id) {
        await writeDoc(token,type,String(item.id),item);
      }
    }
    console.log(`Migrated ${arr.length} ${type}.`);
  }

  const users = exported.users || [];
  for (const u of users) {
    if (!u || !u.email) continue;
    const id = Buffer.from(u.email).toString('base64url').slice(0,120);
    await writeDoc(token,'legacyUsers',id,{
      ...u,
      migratedAt:new Date().toISOString()
    });
  }

  console.log(`Preserved ${users.length} old user profiles in legacyUsers.`);
  console.log('\nMIGRATION COMPLETE.');
  console.log('Old user passwords were not copied. Existing users will need Firebase accounts/password reset.');
} catch (e) {
  console.error('\nMIGRATION FAILED:', e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
