const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. ABLE cannot use persistent PostgreSQL storage.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const dbFile = path.join(__dirname, 'data', 'db.json');

function emptyState() {
  return {
    users: [],
    problems: [],
    articles: [],
    contests: [],
    exams: []
  };
}

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS able_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);

  const existing = await pool.query('SELECT id FROM able_state WHERE id = 1');

  if (!existing.rowCount) {
    let initial = emptyState();

    if (fs.existsSync(dbFile)) {
      try {
        initial = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        initial.users ??= [];
        initial.problems ??= [];
        initial.articles ??= [];
        initial.contests ??= [];
        initial.exams ??= [];
      } catch (e) {
        console.warn('Could not read data/db.json; starting with an empty PostgreSQL state.');
      }
    }

    await pool.query(
      'INSERT INTO able_state (id, data) VALUES (1, $1)',
      [initial]
    );

    console.log('ABLE PostgreSQL storage initialized.');
  } else {
    console.log('ABLE PostgreSQL storage already exists; existing data preserved.');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error('PostgreSQL initialization failed:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
