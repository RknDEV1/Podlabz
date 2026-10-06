// ============================================
// BuckPay — Integração de pagamento Pix
// ============================================
const BASE = process.env.BUCKPAY_BASE_URL || 'https://api.realtechdev.com.br/v1';
const TOKEN = process.env.BUCKPAY_TOKEN;
const USER_AGENT = process.env.BUCKPAY_USER_AGENT || 'Buckpay API';

async function criarCobranca({ pedidoId, itens, cliente }) {
  const total = itens.reduce(
    (s, i) => s + Math.round((i.preco_centavos * i.quantidade) / 1), 0
  );

  // BuckPay exige mínimo de R$ 6,00
  if (total < 600) {
    throw new Error('Valor mínimo do Pix é R$ 6,00');
  }

  // external_id: só letras, números, hífens e underscores
  const externalId = 'pedido_' + pedidoId + '_' + Date.now();

  const body = {
    external_id: externalId,
    payment_method: 'pix',
    amount: total,
    buyer: {
      name: cliente.nome,
      email: cliente.email,
      document: (cliente.cpf || '').replace(/\D/g, '') || undefined,
      phone: (cliente.telefone || '').replace(/\D/g, '') || undefined
    },
    product: {
      name: 'Pedido Podlabz #' + pedidoId
    }
  };

  const res = await fetch(BASE + '/transactions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const detail = data?.error?.detail ? ' - ' + JSON.stringify(data.error.detail) : '';
    throw new Error('BuckPay erro ' + res.status + ': ' + msg + detail);
  }

  const p = data.data || {};
  return {
    id: p.id,
    status: p.status,
    pixCopyPaste: p.pix?.code || null,
    qrCodeBase64: p.pix?.qrcode_base64 || null,
    expiresAt: p.expires_at || null,
    total: p.total_amount
  };
}

async function consultarPagamento(paymentId) {
  const res = await fetch(BASE + '/transactions/' + paymentId, {
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'User-Agent': USER_AGENT
    }
  });
  if (!res.ok) throw new Error('Erro ao consultar pagamento ' + paymentId);
  const data = await res.json();
  return data.data || data;
}

async function simularPagamento(paymentId, status = 'PAID') {
  // BuckPay não tem endpoint público de simulação.
  // Em sandbox, use o painel deles pra forçar.
  console.log('⚠️  BuckPay não tem simulação por API. Use o painel.');
  return { ok: false, msg: 'Simule pelo painel da BuckPay' };
}

module.exports = { criarCobranca, consultarPagamento, simularPagamento };
