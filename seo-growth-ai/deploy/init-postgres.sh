#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username postgres --port 55432 --dbname postgres --set=app_password="$PG_APP_PASSWORD" <<'SQL'
CREATE ROLE seo_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE local_seo OWNER seo_app;
SQL
psql -v ON_ERROR_STOP=1 --username postgres --port 55432 --dbname local_seo -c 'CREATE EXTENSION vector'
