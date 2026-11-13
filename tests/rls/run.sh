#!/usr/bin/env bash
# Runs the real migration + RLS assertions on a throwaway local PostgreSQL (no Supabase account needed).
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
[ -x "$PGBIN/initdb" ] || { echo "PostgreSQL server binaries not found (need postgresql package)"; exit 2; }
DIR=$(mktemp -d); chmod 755 "$DIR"; chown postgres "$DIR" 2>/dev/null || true
PORT=54329
as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
as_pg "$PGBIN/initdb -D $DIR/data -A trust >/dev/null"
as_pg "$PGBIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log -w start >/dev/null"
trap 'as_pg "$PGBIN/pg_ctl -D $DIR/data -m immediate stop >/dev/null" || true; rm -rf "$DIR"' EXIT
PSQL="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "create database hub" >/dev/null
$PSQL -d hub -f tests/rls/stub.sql
$PSQL -d hub -f supabase/migrations/0001_init.sql
OUT=$($PSQL -d hub -f tests/rls/rls.test.sql)
echo "$OUT"
echo "$OUT" | grep -q " 0$" || { echo "RLS TESTS FAILED"; exit 1; }
echo "RLS TESTS PASSED"
