// api.js - by:proxlu

const express = require('express');
const qrcode = require('qrcode-terminal');
const wppconnect = require('@wppconnect-team/wppconnect');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const vision = require('@google-cloud/vision');
const ffmpeg = require('fluent-ffmpeg');
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./google.json";

const clientSpeech = new speech.SpeechClient();
const clientVision = new vision.ImageAnnotatorClient();

const app = express();
app.use(express.json());
const sessionDir = path.resolve('./tokens/bot-session');
let client = null;

async function checkFFmpeg() {
  return new Promise((resolve, reject) => {
    ffmpeg.getAvailableFormats((err) => {
      if (err) {
        reject(new Error('ffmpeg não está instalado ou não está no PATH.'));
      } else {
        resolve();
      }
    });
  });
}

async function getClient() {
  if (!client) {
    try {
      client = await wppconnect.create({
        session: 'bot-session',
        folderNameToken: 'tokens',
        mkdirFolderToken: sessionDir,
        catchQR: (base64Qr, asciiQR) => {
          console.log('Escaneie o QR Code abaixo para conectar:');
          qrcode.generate(asciiQR, { small: true });
        },
        autoClose: false,
        puppeteerOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });
      console.log('✅ Bot conectado e pronto para uso!');
      client.onMessage(processMessage);
    } catch (error) {
      console.log('Erro ao iniciar o bot:', error);
    }
  }
  return client;
}

async function processMessage(msg) {
  console.log(`📩 Nova mensagem de ${msg.from}: ${msg.body}`);

  if (msg.from.includes('@g.us')) {
    console.log('🚫 Mensagem de grupo detectada. Ignorando...');
    return;
  }

  let messageContent = msg.body;
  if (msg.type === 'ptt' || msg.type === 'image') {
    try {
      console.log(`Baixando mídia (${msg.type})...`);
      const filePath = await downloadMedia(msg);
      console.log(`Arquivo salvo: ${filePath}`);
      
      if (msg.type === 'ptt') {
        await checkFFmpeg();
        messageContent = await transcribeAudio(filePath);
      } else if (msg.type === 'image') {
        messageContent = await detectTextInImage(filePath);
      }
    } catch (err) {
      console.error(`Erro no processamento de mídia (${msg.type}):`, err);
      messageContent = `Erro ao processar ${msg.type}`;
    }
  }

  if (!messageContent || messageContent.trim() === '') {
    messageContent = 'Nenhum conteúdo transcrito ou erro na conversão';
  }

  await sendToWebhooks({ body: messageContent, number: msg.from, timestamp: new Date().toISOString() });
}

async function downloadMedia(msg) {
  const media = await client.decryptFile(msg);
  const downloadsDir = path.resolve('./downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }
  const filePath = path.resolve(downloadsDir, `${msg.id}.${msg.type}`);
  fs.writeFileSync(filePath, media);
  return filePath;
}

async function convertAudioToWav(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.wav');
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => {
        console.log(`Conversão concluída: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Erro na conversão de áudio:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

async function transcribeAudio(filePath) {
  const wavPath = await convertAudioToWav(filePath);
  const audio = { content: fs.readFileSync(wavPath).toString('base64') };
  const config = { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'pt-BR' };
  const request = { audio, config };
  const [response] = await clientSpeech.recognize(request);
  return response.results?.map(r => r.alternatives[0].transcript).join('\n') || 'Nenhuma transcrição encontrada';
}

async function detectTextInImage(imagePath) {
  const [result] = await clientVision.textDetection(imagePath);
  return result.textAnnotations.length > 0 ? result.textAnnotations[0].description.trim() : 'Nenhum texto encontrado';
}

async function sendToWebhooks(payload) {
  const webhooks = [
    'http://0.0.0.0/webhook/',
    'http://0.0.0.0/webhook-test/'
  ];
  for (const webhook of webhooks) {
    try {
      const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log(`Resposta do webhook ${webhook}:`, await res.text());
    } catch (err) {
      console.error(`Erro ao enviar para o webhook ${webhook}:`, err);
    }
  }
}

app.post('/send', async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
  try {
    const client = await getClient();
    const chatId = number.includes('@c.us') || number.includes('@g.us') ? number : `${number}@c.us`;
    await client.sendText(chatId, message);
    res.json({ success: true, message: `Mensagem enviada para ${number}` });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem', details: error.message });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Servidor Express rodando em http://0.0.0.0:3000');
});

getClient();
