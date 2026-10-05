const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function enviar(texto) {
  if (!TOKEN || !CHAT_ID) { console.warn('Telegram nao configurado'); return null; }
  try {
    const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: texto, parse_mode: 'HTML' })
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
    '<b>Subtotal:</b> R$ ' + ((p.total_centavos - (p.frete_centavos || 0)) / 100).toFixed(2),
    '<b>Frete:</b> R$ ' + ((p.frete_centavos || 0) / 100).toFixed(2),
    '<b>Total:</b> R$ ' + (p.total_centavos / 100).toFixed(2),
    '',
    '<b>Cliente:</b> ' + p.cliente_nome,
    '<b>CPF:</b> ' + (p.cpf || '-'),
    '<b>Telefone:</b> ' + p.cliente_telefone,
    '<b>E-mail:</b> ' + p.cliente_email,
    '',
    '<b>Entregar em:</b>',
    (p.rua || '') + ', ' + (p.numero || '') + (p.complemento ? ' - ' + p.complemento : ''),
    (p.bairro || '') + ' — ' + (p.cidade || '') + '/' + (p.estado || ''),
    'CEP: ' + (p.cep || '')
  ].join('\n');

  return await enviar(txt);
}

module.exports = { enviar, notificarPedido };
