const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const db = new Database(path.join(dir, 'loja.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT DEFAULT 'Geral',
  preco_centavos INTEGER NOT NULL,
  imagem TEXT,
  estoque INTEGER DEFAULT 0,
  destaque INTEGER DEFAULT 0,
  sabores TEXT
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  endereco TEXT NOT NULL,
  total_centavos INTEGER NOT NULL,
  status TEXT DEFAULT 'pendente',
  yuvex_payment_id TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  pago_em TEXT
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER,
  nome TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);
`);

const total = db.prepare('SELECT COUNT(*) AS n FROM produtos').get().n;
if (total === 0) {
  const inserir = db.prepare(`
    INSERT INTO produtos (nome, descricao, categoria, preco_centavos, imagem, estoque, destaque, sabores)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const produtos = [
    // ===== IGNITE =====
    ['Ignite V Nano', '1.000 puffs · 9 sabores', 'Ignite', 7000, 20, 0],
    ['Ignite V35', '3.500 puffs · 8 sabores', 'Ignite', 8000, 20, 0],
    ['Ignite V55', '5.500 puffs · 9 sabores', 'Ignite', 12000, 20, 1],
    ['Ignite V80', '8.000 puffs · 7 sabores', 'Ignite', 14000, 20, 0],
    ['Ignite V155', '15.500 puffs · 16 sabores', 'Ignite', 14000, 15, 1],
    ['Ignite V40', '4.000 puffs · 8 sabores', 'Ignite', 17000, 15, 0],
    ['Ignite V300', '30.000 puffs · 14 sabores', 'Ignite', 18000, 10, 1],
    ['Ignite V400 Mix', '40.000 puffs · 13 mixes', 'Ignite', 18000, 8, 0],
    ['Ignite V500', '50.000 puffs · 17 sabores', 'Ignite', 20000, 5, 1],

    // ===== ELFBAR =====
    ['Elfbar BC15K', '15.000 puffs · 17 sabores', 'Elfbar', 12000, 15, 1],
    ['Elfbar GH', '23.000 puffs · 13 sabores', 'Elfbar', 15000, 12, 0],
    ['Elfbar TE', '30.000 puffs · 17 sabores', 'Elfbar', 15000, 10, 1],
    ['Elfbar Duke', '20.000 puffs · 11 sabores', 'Elfbar', 16000, 10, 0],
    ['Elfbar 40K', '40.000 puffs · 22 sabores', 'Elfbar', 16000, 8, 1],
    ['Elfbar BC45K', '45.000 puffs · 11 sabores', 'Elfbar', 18000, 6, 0],

    // ===== LOST MARY =====
    ['Lost Mary Mixer', '30.000 puffs · 5 sabores', 'Lost Mary', 14000, 10, 0],

    // ===== OUTRAS MARCAS =====
    ['HOD', '12.000 puffs · 2 sabores', 'Outras Marcas', 14000, 12, 0],
    ['Rabbeats RC', '50.000 puffs · 9 sabores', 'Outras Marcas', 16000, 8, 0],
    ['Black Sheep 55K', '55.000 puffs · 8 sabores', 'Outras Marcas', 26000, 5, 1],
  ];

  for (const [nome, desc, cat, preco, estoque, destaque] of produtos) {
    const slug = nome.toLowerCase().replace(/[^a-z0-9]/g, '-');
    inserir.run(nome, desc, cat, preco, `https://picsum.photos/seed/${slug}/600/600`, estoque, destaque, null);
  }
}

module.exports = db;
