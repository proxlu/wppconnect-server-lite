const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');

// Criação da aplicação Express
const app = express();
app.use(express.json());

// Inicializa o cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth/session' }),  // Usa LocalAuth para manter a sessão
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']  // Configuração do Puppeteer para não usar sandbox
    }
});

// Exibe o QR Code no terminal para login
client.on('qr', (qr) => {
    console.log('Escaneie o QR Code abaixo para conectar:');
    qrcode.generate(qr, { small: true }); // Gera o QR Code no terminal
});

// Mensagem quando o bot estiver pronto
client.on('ready', () => {
    console.log('✅ Bot conectado e pronto para uso!');
});

// Endpoint para enviar mensagens via API
app.post('/send', async (req, res) => {
    const { number, message } = req.body;

    // Verifica se o número e a mensagem foram passados corretamente
    if (!number || !message) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
    }

    // Verifica se o cliente está pronto antes de tentar enviar a mensagem
    if (!client.info || !client.info.wid) {
        return res.status(500).json({ error: "O cliente do WhatsApp ainda não está pronto." });
    }

    try {
        // Formata o número para o formato correto
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.json({ success: true, message: `Mensagem enviada para ${number}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao enviar mensagem', details: error.message });
    }
});

// Endpoint para receber mensagens recebidas
client.on('message', (msg) => {
    console.log(`📩 Nova mensagem de ${msg.from}: ${msg.body}`);
});

// Inicia o servidor Express
app.listen(3000, 'vps57267.publiccloud.com.br', () => {
    console.log(`Servidor rodando em http://vps57267.publiccloud.com.br:3000`);
});

// Inicializa o cliente do WhatsApp
client.initialize();
