const API = process.env.YUVEX_BASE_URL || 'https://api.yuvexpay.com/v1';
const KEY = process.env.YUVEX_API_KEY;

async function criarCobranca({ pedidoId, itens, cliente }) {
  const total = itens.reduce(
    (s, i) => s + (i.preco_centavos * i.quantidade) / 100, 0
  );

  const res = await fetch(`${API}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `pedido-${pedidoId}-v1`
    },
    body: JSON.stringify({
      amount: Number(total.toFixed(2)),
      methods: ['PIX'],
      currency: 'BRL',
      mode: 'headless',
      description: `Pedido #${pedidoId}`,
      externalId: String(pedidoId),
      expiresInMinutes: 30,
      customer: {
        name: cliente.nome,
        email: cliente.email,
        phone: cliente.telefone,
        document: cliente.cpf || undefined
      },
      metadata: { order_id: String(pedidoId), source: 'website' }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YuvexPay erro ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.payment;
}

async function consultarPagamento(paymentId) {
  const res = await fetch(`${API}/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${KEY}` }
  });
  if (!res.ok) throw new Error(`Erro ao consultar pagamento ${paymentId}`);
  return await res.json();
}

async function simularPagamento(paymentId, status = 'PAID') {
  const res = await fetch(`${API}/payments/${paymentId}/simulate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });
  return await res.json();
}

module.exports = { criarCobranca, consultarPagamento, simularPagamento };
