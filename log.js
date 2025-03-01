const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

// Carregar certificados SSL
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/vps57267.publiccloud.com.br/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/vps57267.publiccloud.com.br/fullchain.pem')
};

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Iniciar o servidor HTTPS na porta 8443
https.createServer(options, app).listen(8443, () => {
    console.log('Servidor rodando em https://vps57267.publiccloud.com.br:8443');
});
