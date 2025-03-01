#!/bin/bash
export N8N_PROTOCOL=https
export N8N_PORT=443
export N8N_HOST=0.0.0.0
export N8N_SECURE_COOKIE=false
export N8N_SSL_CERT=/etc/letsencrypt/live/0.0.0.0/fullchain.pem
export N8N_SSL_KEY=/etc/letsencrypt/live/0.0.0.0/privkey.pem
export N8N_USER_FOLDER=$HOME
nohup npx n8n > n8n.log 2>&1 &
nohup node api.js > public/index.html 2>&1 &
nohup node log.js > log.log 2>&1 &
