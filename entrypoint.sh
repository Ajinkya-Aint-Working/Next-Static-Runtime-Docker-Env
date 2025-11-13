#!/bin/sh
set -e

# Replace variables in env.template.js → env.js
envsubst < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js

exec "$@"
