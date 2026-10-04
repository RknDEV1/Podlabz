const express = require('express');
const P = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const PORT = 8080;
const API_KEY = 'podlabz2026';
let sock = null;
let qrAtual = null;
async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_whatsapp');
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }), printQRInTerminal: false, browser: ['Podlabz', 'Chrome', '1.0.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) { qrAtual = qr; console.log('QR gerado'); }
    if (connection === 'open') { console.log('CONECTADO'); qrAtual = null; }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) { console.log('Reconectando...'); setTimeout(iniciar, 3000); }
    }
  });
}

const app = express();
app.use(express.json());
function auth(req, res, next) {
  if (req.headers.apikey !== API_KEY) return res.status(401).json({ erro: 'apikey invalida' });
  next();
}
app.post('/message/sendText/:instancia', auth, async (req, res) => {
  try {
    if (!sock || !sock.user) return res.status(503).json({ erro: 'nao conectado' });
    const { number, text } = req.body;
    const jid = String(number).replace(/\D/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text });
    console.log('Enviado para', jid);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});
app.get('/pairing', async (req, res) => {
  try {
    const number = req.query.number;
    if (!number) return res.status(400).json({ erro: 'use ?number=5511999999999' });
    if (!sock) return res.status(500).json({ erro: 'socket nao iniciado' });
    if (sock.user) return res.json({ mensagem: 'ja conectado', numero: sock.user.id });
    const code = await sock.requestPairingCode(String(number).replace(/\D/g, ''));
    console.log('PAIRING CODE:', code);
    res.json({ pairingCode: code });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});
app.get('/status', (_req, res) => res.json({ conectado: !!(sock && sock.user), numero: sock?.user?.id || null }));
app.get('/', (_req, res) => res.json({ status: 200, message: 'WhatsApp helper OK' }));

iniciar();
app.listen(PORT, () => console.log('Helper em http://localhost:' + PORT));
