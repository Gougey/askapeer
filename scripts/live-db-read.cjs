// The Node route for scripts/live-db-read.sh, used when Docker is not running (a new laptop,
// or Docker Desktop stuck after a macOS update). The SQL has already passed the shell script's
// statement check; this adds the same two Postgres-side guards as the psql route: the session
// is read-only by default, and everything runs inside BEGIN READ ONLY … ROLLBACK.
//
// Uses the `pg` driver the API already depends on, so there is nothing to install.
// Usage (from live-db-read.sh): RO_URL=… node scripts/live-db-read.cjs < body.sql
const { Client } = require('pg');

async function main() {
  const body = require('fs').readFileSync(0, 'utf8');
  const client = new Client({
    connectionString: process.env.RO_URL,
    options: '-c default_transaction_read_only=on',
  });
  await client.connect();
  try {
    await client.query('begin transaction read only');
    // psql meta lines: \echo prints, \timing and \x mean nothing here.
    for (const chunk of body.split(';')) {
      for (const line of chunk.split('\n')) {
        const echo = line.match(/^\s*\\echo\s?(.*)$/);
        if (echo) console.log(echo[1]);
      }
      const sql = chunk.replace(/^\s*\\\S+.*$/gm, '').trim();
      if (!sql) continue;
      const { rows } = await client.query(sql);
      if (rows.length === 0) console.log('(0 rows)');
      else console.table(rows);
    }
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
