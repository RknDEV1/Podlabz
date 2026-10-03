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
  destaque INTEGER DEFAULT 0
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
    INSERT INTO produtos (nome, descricao, categoria, preco_centavos, imagem, estoque, destaque)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  inserir.run('Camiseta Preta', 'Algodão 100%, tam M', 'Roupas', 5990,
    'https://picsum.photos/seed/camiseta/400/400', 20, 1);
  inserir.run('Caneca Branca', 'Cerâmica 300ml', 'Casa', 3490,
    'https://picsum.photos/seed/caneca/400/400', 50, 0);
  inserir.run('Boné Trucker', 'Ajustável, unissex', 'Acessórios', 4990,
    'https://picsum.photos/seed/bone/400/400', 15, 1);
  inserir.run('Moletom Cinza', 'Fleece, tam G', 'Roupas', 12990,
    'https://picsum.photos/seed/moletom/400/400', 8, 0);
  inserir.run('Garrafa Térmica', 'Inox 500ml', 'Casa', 7990,
    'https://picsum.photos/seed/garrafa/400/400', 30, 1);
  inserir.run('Chinelo Slide', 'Tam 40', 'Acessórios', 3990,
    'https://picsum.photos/seed/chinelo/400/400', 12, 0);
}

module.exports = db;
