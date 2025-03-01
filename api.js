// api.js - by:proxlu

const express = require('express');
const qrcode = require('qrcode-terminal');
const wppconnect = require('@wppconnect-team/wppconnect');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const vision = require('@google-cloud/vision');
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./google.json";
const ffmpeg = require('fluent-ffmpeg');

const clientSpeech = new speech.SpeechClient();
const clientVision = new vision.ImageAnnotatorClient();

const app = express();
app.use(express.json());
const sessionDir = path.resolve('./.wppconnect/bot-session');
let client = null;

// Verifica se o ffmpeg está instalado
function checkFFmpeg() {
  return new Promise((resolve, reject) => {
    ffmpeg.getAvailableFormats((err, formats) => {
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
  console.log(`Nova mensagem de ${msg.from}: ${msg.body}`);
  let messageContent = msg.body;

  if (msg.type === 'ptt' || msg.type === 'image') {
    try {
      console.log(`Baixando mídia (${msg.type})...`);
      const filePath = await downloadMedia(msg);
      console.log(`Arquivo salvo: ${filePath}`);
      
      if (msg.type === 'ptt') {
        await checkFFmpeg(); // Verifica se o ffmpeg está instalado
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

  const payload = {
    body: messageContent,
    number: msg.from,
    timestamp: new Date().toISOString()
  };

  await sendToWebhooks(payload);
}

async function sendToWebhooks(payload) {
  const webhooks = [
    'https://vps57267.publiccloud.com.br/webhook/wppconnect-server-lite',
    'https://vps57267.publiccloud.com.br/webhook-test/wppconnect-server-lite'
  ];

  for (const webhook of webhooks) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`Resposta do webhook ${webhook}:`, await res.text());
    } catch (err) {
      console.error(`Erro ao enviar para o webhook ${webhook}:`, err);
    }
  }
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
  try {
    console.log(`Convertendo áudio para WAV: ${filePath}`);
    const wavPath = await convertAudioToWav(filePath);
    console.log(`Áudio convertido para WAV: ${wavPath}`);
    
    const audio = { content: fs.readFileSync(wavPath).toString('base64') };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'pt-BR'
    };
    const request = { audio, config };
    const [response] = await clientSpeech.recognize(request);
    
    console.log('Resposta da API Google Speech:', JSON.stringify(response, null, 2));
    
    if (!response.results || response.results.length === 0) {
      console.log('Nenhuma transcrição detectada');
      return 'Nenhuma transcrição detectada';
    }
    
    const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
    console.log(`Transcrição gerada: ${transcription}`);
    return transcription.trim() !== '' ? transcription : 'Nenhuma transcrição encontrada';
  } catch (error) {
    console.error('Erro na transcrição de áudio:', error);
    return 'Erro ao transcrever áudio';
  }
}

async function detectTextInImage(imagePath) {
  try {
    const [result] = await clientVision.textDetection(imagePath);
    const detections = result.textAnnotations;
    return detections.length > 0 ? detections[0].description.trim() : 'Nenhum texto encontrado';
  } catch (error) {
    console.error('Erro na extração de texto da imagem:', error);
    return 'Erro ao extrair texto da imagem';
  }
}

// Endpoint para enviar mensagens via API para o WhatsApp
app.post('/send', async (req, res) => {
  console.log("Processando requisição de envio...");
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
  }

  try {
    const client = await getClient();
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

    // Envia a mensagem de texto via WhatsApp
    await client.sendText(chatId, message);
    console.log(`Mensagem enviada para ${number}: ${message}`);
    res.json({ success: true, message: `Mensagem enviada para ${number}` });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem', details: error.message });
  }
});

// Inicia o servidor Express
app.listen(3000, '0.0.0.0', () => {
  console.log('Servidor Express rodando em http://0.0.0.0:3000');
});

// Inicia o bot
getClient();
