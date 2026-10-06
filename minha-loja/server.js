require('dotenv').config();
const express = require('express');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { criarCobranca, consultarPagamento, simularPagamento } = require('./lib/pagamento');
const { notificarPedido, enviar } = require('./lib/telegram');
const { calcularFrete } = require('./lib/frete');

const app = express();

/* ---------- WEBHOOK BUCKPAY (antes do express.json) ---------- */
app.post('/webhook/buckpay', express.json(), async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body || {};
    const event = body.event || '';
    const data = body.data || {};
    console.log('Webhook BuckPay:', event, '| ID:', data.id, '| Status:', data.status);
    if (event !== 'transaction.processed' || data.status !== 'paid') {
      console.log('Ignorado:', event, data.status);
      return;
    }
    const txId = data.id;
    if (!txId) return;
    const pedido = db.prepare('SELECT * FROM pedidos WHERE yuvex_payment_id = ?').get(txId);
    if (!pedido) { console.log('Pedido nao encontrado:', txId); return; }
    if (pedido.status === 'pago') return;
    db.prepare("UPDATE pedidos SET status='pago', pago_em=datetime('now') WHERE id=?").run(pedido.id);
    const itens = db.prepare('SELECT * FROM pedido_itens WHERE pedido_id = ?').all(pedido.id);
    const baixar = db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ?');
    for (const i of itens) baixar.run(i.quantidade, i.produto_id);
    await notificarPedido({ ...pedido, status: 'pago' }, itens);
    console.log('Pedido ' + pedido.id + ' confirmado!');
  } catch (err) {
    console.error('Erro webhook BuckPay:', err);
  }
});

/* ---------- MIDDLEWARES ---------- */
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', etag: true }));





/* ---------- Produtos / Catálogo ---------- */
app.get('/api/produtos', (_req, res) => {
  res.json(db.prepare('SELECT * FROM produtos').all());
});

app.get('/api/categorias', (_req, res) => {
  res.json(db.prepare(
    'SELECT categoria, COUNT(*) AS total FROM produtos GROUP BY categoria ORDER BY categoria'
  ).all());
});

app.get('/api/catalogo', (req, res) => {
  const { q, categoria, ordem, destaque } = req.query;
  let sql = 'SELECT * FROM produtos WHERE 1=1';
  const params = [];

  if (q) { sql += ' AND (nome LIKE ? OR descricao LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (categoria && categoria !== 'Todas') { sql += ' AND categoria = ?'; params.push(categoria); }
  if (destaque === '1') sql += ' AND destaque = 1';

  const ordens = {
    'recentes': 'id DESC',
    'menor-preco': 'preco_centavos ASC',
    'maior-preco': 'preco_centavos DESC',
    'nome': 'nome ASC'
  };
  sql += ' ORDER BY ' + (ordens[ordem] || 'id DESC');

  res.json(db.prepare(sql).all(...params));
});

/* ---------- Sabores do produto (ANTES da rota :id) ---------- */
app.get('/api/produtos/:id/sabores', (req, res) => {
  const p = db.prepare('SELECT sabores FROM produtos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ erro: 'Produto não encontrado.' });
  const lista = p.sabores ? p.sabores.split(',').map(s => s.trim()).filter(Boolean) : [];
  res.json({ sabores: lista });
});

app.get('/api/produtos/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ erro: 'Produto não encontrado.' });
  res.json(p);
});

/* ---------- Pedidos ---------- */
app.post('/api/pedidos', async (req, res) => {
  try {
    const { cliente, itens, frete } = req.body;
    if (!cliente?.nome || !cliente?.email || !cliente?.telefone || !cliente?.cep || !cliente?.rua || !cliente?.numero || !cliente?.cidade)
      return res.status(400).json({ erro: 'Dados do cliente incompletos.' });
    if (!Array.isArray(itens) || itens.length === 0)
      return res.status(400).json({ erro: 'Carrinho vazio.' });
    if (!frete || typeof frete.preco !== 'number')
      return res.status(400).json({ erro: 'Frete obrigatorio. Calcule antes de finalizar.' });

    const ids = itens.map(i => i.produtoId);
    const placeholders = ids.map(() => '?').join(',');
    const produtos = db.prepare(`SELECT * FROM produtos WHERE id IN (${placeholders})`).all(...ids);
    const mapa = Object.fromEntries(produtos.map(p => [p.id, p]));

    const itensNormalizados = [];
    let total = 0;

    for (const item of itens) {
      const p = mapa[item.produtoId];
      if (!p) return res.status(400).json({ erro: `Produto ${item.produtoId} inválido.` });
      const qtd = Math.max(1, parseInt(item.quantidade) || 1);
      if (p.estoque < qtd)
        return res.status(400).json({ erro: `Estoque insuficiente para ${p.nome}.` });

      itensNormalizados.push({
        produto_id: p.id, nome: p.nome,
        preco_centavos: p.preco_centavos, quantidade: qtd
      });
      total += p.preco_centavos * qtd;
    }

    const enderecoCompleto = [cliente.rua, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade + '-' + cliente.estado, 'CEP ' + cliente.cep].filter(Boolean).join(', ');
    const freteCentavos = frete ? Math.round(frete.preco * 100) : 0;
    total += freteCentavos;
    const info = db.prepare(`
      INSERT INTO pedidos (cliente_nome, cliente_email, cliente_telefone, endereco, total_centavos, frete_centavos, cpf, cep, rua, numero, complemento, bairro, cidade, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cliente.nome, cliente.email, cliente.telefone, enderecoCompleto, total, freteCentavos, cliente.cpf||null, cliente.cep||null, cliente.rua||null, cliente.numero||null, cliente.complemento||null, cliente.bairro||null, cliente.cidade||null, cliente.estado||null);

    const pedidoId = info.lastInsertRowid;

    const inserirItem = db.prepare(`
      INSERT INTO pedido_itens (pedido_id, produto_id, nome, preco_centavos, quantidade)
      VALUES (?, ?, ?, ?, ?)
    `);
    const inserirVarios = db.transaction(lista => {
      for (const i of lista)
        inserirItem.run(pedidoId, i.produto_id, i.nome, i.preco_centavos, i.quantidade);
    });
    inserirVarios(itensNormalizados);

    const pagamento = await criarCobranca({ pedidoId, itens: itensNormalizados, cliente });

    db.prepare('UPDATE pedidos SET yuvex_payment_id = ? WHERE id = ?')
      .run(pagamento.id, pedidoId);

    res.json({
      pedidoId,
      paymentId: pagamento.id,
      pixCopiaECola: pagamento.pixCopyPaste || (pagamento.methodData && pagamento.methodData.pixCopyPaste) || null,
      qrCodeBase64: pagamento.qrCodeBase64 || (pagamento.methodData && pagamento.methodData.qrCodeBase64) || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Falha ao criar pedido: ' + err.message });
  }
});

app.get('/api/pedidos/:id', (req, res) => {
  const pedido = db.prepare('SELECT id, status, total_centavos FROM pedidos WHERE id = ?')
    .get(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  res.json(pedido);
});

app.post('/api/simular/:pedidoId', async (req, res) => {
  try {
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.pedidoId);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    await simularPagamento(pedido.yuvex_payment_id, 'PAID');

    db.prepare(`UPDATE pedidos SET status='pago', pago_em=datetime('now') WHERE id=?`)
      .run(pedido.id);

    const itens = db.prepare('SELECT * FROM pedido_itens WHERE pedido_id = ?').all(pedido.id);
    const baixar = db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ?');
    for (const i of itens) baixar.run(i.quantidade, i.produto_id);

    await notificarPedido({ ...pedido, status: 'pago' }, itens);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/testar-whatsapp', async (_req, res) => {
  const r = await enviar('✅ Teste de notificação da Minha Loja funcionando!');
  res.json({ ok: !!r });
});


/* ---------- ADMIN ---------- */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'podlabz123';
const adminTokens = new Set();

function authAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || !adminTokens.has(token)) return res.status(401).json({ erro: 'Não autorizado' });
  next();
}

app.post('/api/admin/login', (req, res) => {
  if (req.body.senha !== ADMIN_PASSWORD) return res.status(401).json({ erro: 'Senha incorreta' });
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.add(token);
  res.json({ token });
});

app.post('/api/admin/logout', authAdmin, (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  adminTokens.delete(token);
  res.json({ ok: true });
});

app.get('/api/admin/pedidos', authAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM pedidos ORDER BY id DESC').all());
});

app.get('/api/admin/pedidos/:id', authAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado' });
  p.itens = db.prepare('SELECT * FROM pedido_itens WHERE pedido_id = ?').all(req.params.id);
  res.json(p);
});

app.patch('/api/admin/pedidos/:id', authAdmin, (req, res) => {
  db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/produtos', authAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM produtos ORDER BY id DESC').all());
});

app.post('/api/admin/produtos', authAdmin, (req, res) => {
  const b = req.body;
  const info = db.prepare('INSERT INTO produtos (nome, descricao, categoria, preco_centavos, estoque, imagem, sabores, destaque) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(b.nome, b.descricao||'', b.categoria||'Geral', b.preco_centavos||0, b.estoque||0, b.imagem||'', b.sabores||'', b.destaque||0);
  res.json({ id: info.lastInsertRowid });
});

app.patch('/api/admin/produtos/:id', authAdmin, (req, res) => {
  const b = req.body;
  db.prepare('UPDATE produtos SET nome=?, descricao=?, categoria=?, preco_centavos=?, estoque=?, imagem=?, sabores=?, destaque=? WHERE id=?')
    .run(b.nome, b.descricao, b.categoria, b.preco_centavos, b.estoque, b.imagem, b.sabores, b.destaque, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/produtos/:id', authAdmin, (req, res) => {
  db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});


app.get('/admin', (_req, res) => res.type('html').sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 3000;
app.post('/api/meus-pedidos', (req, res) => {
  const email = (req.body && req.body.email) || '';
  if (!email || email.indexOf('@') === -1) return res.status(400).json({ erro: 'Email invalido' });
  const lista = db.prepare('SELECT id, status, total_centavos, criado_em, pago_em, rua, numero, bairro, cidade, estado FROM pedidos WHERE LOWER(cliente_email) = LOWER(?) ORDER BY id DESC').all(email);
  for (const p of lista) {
    p.itens = db.prepare('SELECT nome, quantidade, sabor, preco_centavos FROM pedido_itens WHERE pedido_id = ?').all(p.id);
  }
  res.json(lista);
});

app.post('/api/frete', async (req, res) => {
  try {
    const { cep, itens } = req.body;
    if (!cep || cep.replace(/\D/g,'').length !== 8) return res.status(400).json({ erro: 'CEP invalido' });
    const opcoes = await calcularFrete({ cepDestino: cep, itens: itens });
    res.json(opcoes);
  } catch (e) {
    console.error('Erro /api/frete:', e);
    res.status(500).json({ erro: 'Falha ao calcular' });
  }
});

app.listen(PORT, () => console.log(`🚀 Loja rodando em http://localhost:${PORT}`));
