const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME     = process.env.EVOLUTION_INSTANCE_NAME;
const MEU_NUMERO        = process.env.MEU_NUMERO_WHATSAPP;

const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function enviar(texto, numero = MEU_NUMERO) {
  if (!EVOLUTION_API_KEY || !INSTANCE_NAME) {
    console.warn('⚠️  Evolution API não configurada.');
    return;
  }
  if (!numero) {
    console.warn('⚠️  Nenhum número destino definido.');
    return;
  }

  const destino = String(numero).replace(/\D/g, '');
  const url = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: destino,
        text: texto,
        options: { delay: 1200, presence: 'composing', linkPreview: false }
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('❌ Erro ao enviar WhatsApp:', res.status, JSON.stringify(data));
      return null;
    }
    console.log('✅ Notificação WhatsApp enviada para', destino);
    return data;
  } catch (err) {
    console.error('❌ Falha na requisição para Evolution API:', err.message);
    return null;
  }
}

async function notificarPedido(pedido, itens) {
  const itensTexto = itens
    .map(i => `  • ${i.quantidade}x ${i.nome} — ${brl(i.preco_centavos * i.quantidade)}`)
    .join('\n');

  const texto = [
    `🛒 *NOVO PEDIDO PAGO #${pedido.id}*`,
    ``,
    `*Itens:*`,
    itensTexto,
    ``,
    `*Total:* ${brl(pedido.total_centavos)}`,
    ``,
    `*Cliente:* ${pedido.cliente_nome}`,
    `*Telefone:* ${pedido.cliente_telefone}`,
    `*E-mail:* ${pedido.cliente_email}`,
    ``,
    `*Entregar em:*`,
    pedido.endereco,
    ``,
    `_Pago em ${new Date().toLocaleString('pt-BR')}_`
  ].join('\n');

  return await enviar(texto);
}

module.exports = { enviar, notificarPedido };
