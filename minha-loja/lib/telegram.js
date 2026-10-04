const T = process.env.TELEGRAM_BOT_TOKEN;
const C = process.env.TELEGRAM_CHAT_ID;

async function enviar(texto) {
  if (!T || !C) { console.warn('Telegram nao configurado'); return null; }
  try {
    const r = await fetch('https://api.telegram.org/bot' + T + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: C, text: texto, parse_mode: 'HTML' })
    });
    if (!r.ok) { console.error('Telegram erro:', await r.text()); return null; }
    console.log('Notificacao Telegram enviada');
    return await r.json();
  } catch (e) {
    console.error('Telegram falhou:', e.message);
    return null;
  }
}

async function notificarPedido(p, itens) {
  const linhas = itens.map(i =>
    '  • ' + i.quantidade + 'x ' + i.nome + (i.sabor ? ' [' + i.sabor + ']' : '')
  ).join('\n');

  const txt = [
    '🛒 <b>PODLABZ — NOVO PEDIDO #' + p.id + '</b>',
    '',
    '<b>Itens:</b>',
    linhas,
    '',
    '<b>Total:</b> R$ ' + (p.total_centavos / 100).toFixed(2),
    '',
    '<b>Cliente:</b> ' + p.cliente_nome,
    '<b>Telefone:</b> ' + p.cliente_telefone,
    '<b>E-mail:</b> ' + p.cliente_email,
    '',
    '<b>Entregar em:</b>',
    p.endereco
  ].join('\n');

  return await enviar(txt);
}

module.exports = { enviar, notificarPedido };