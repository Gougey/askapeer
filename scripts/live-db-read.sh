#!/bin/bash
# Run read-only SQL against the LIVE database. Usage: scripts/live-db-read.sh query.sql
#
# This is the one route Claude Code is allowed to the live data (.claude/settings.json), so it
# is written to refuse anything but reading:
#   - every statement must open with a reading keyword (select, with, explain, show, table,
#     values) or be a psql \echo / \timing / \x line, so there is no commit, set or DDL to
#     slip in between statements;
#   - the session runs with default_transaction_read_only=on, inside BEGIN READ ONLY … ROLLBACK,
#     so even a data-modifying CTE is refused by Postgres itself.
# The database URL is read from the API machine and never printed. Connection details:
# askapeer-live-ops in the project memory.
set -euo pipefail

SQL_FILE="${1:?usage: scripts/live-db-read.sh query.sql}"
[ -f "$SQL_FILE" ] || { echo "no such file: $SQL_FILE" >&2; exit 2; }

# Comments out, then one statement per chunk; psql meta lines are checked on their own.
BODY="$(sed -e 's/--.*$//' "$SQL_FILE")"
BAD="$(printf '%s\n' "$BODY" | python3 -I -c '
import re, sys
text = sys.stdin.read()
meta = re.compile(r"^\s*\\(echo|timing|x)\b.*$", re.M | re.I)
for m in re.finditer(r"^\s*\\\S+", text, re.M):
    if not meta.match(text, m.start()):
        print("psql command not allowed: " + m.group().strip())
text = meta.sub("", text)
for stmt in text.split(";"):
    s = stmt.strip()
    if s and not re.match(r"(select|with|explain|show|table|values)\b", s, re.I):
        print("statement not allowed: " + s.split()[0])
')"
if [ -n "$BAD" ]; then echo "$BAD" >&2; echo "refused: read-only queries only" >&2; exit 2; fi

curl -s https://askapeer-api.fly.dev/health >/dev/null || true   # wake the API machine
URL="$(flyctl ssh console -a askapeer-api -C "printenv DATABASE_URL" 2>/dev/null \
  | grep -o 'postgres://[^[:space:]]*' | sed -E 's#@[^/]+/#@host.docker.internal:15432/#')"
[ -n "$URL" ] || { echo "could not read DATABASE_URL from askapeer-api" >&2; exit 1; }

flyctl proxy 15432:5432 -a askapeer-db >/dev/null 2>&1 &
PROXY=$!
trap 'kill $PROXY 2>/dev/null || true' EXIT
sleep 6

{ echo 'begin transaction read only;'; printf '%s\n' "$BODY"; echo ';'; echo 'rollback;'; } \
  | docker run --rm -i -e PGOPTIONS='-c default_transaction_read_only=on' \
      postgres:16-alpine psql "$URL" -P pager=off -v ON_ERROR_STOP=1
