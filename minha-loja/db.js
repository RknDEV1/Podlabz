const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

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
  frete_centavos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  yuvex_payment_id TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  pago_em TEXT,
  cpf TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER,
  nome TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  sabor TEXT
);
`);

const IMAGENS = {
  'Ignite V Nano':'https://i.ibb.co/tPJtntMj/f5fcf823-557a-4275-b1bd-bc7c0db4258c.jpg',
  'Ignite V35':'https://i.ibb.co/cK3Y3S8W/2f5f7700-4477-4f6a-b4bd-62ca8d4fea74.jpg',
  'Ignite V55':'https://i.ibb.co/rGjtfXsG/228365f7-0740-4272-b287-47188a1a7d49.jpg',
  'Ignite V80':'https://i.ibb.co/SwkvzDWv/7af90e8a-e59c-43dd-8122-ddd7344400a2.jpg',
  'Ignite V155':'https://i.ibb.co/FkbyvwXG/5eaf2a4d-f473-4248-860a-b5770584be0c.jpg',
  'Ignite V40':'https://i.ibb.co/BVb832gJ/9d8e2963-7105-419f-9499-b4224bb75f86.jpg',
  'Ignite V300':'https://i.ibb.co/5xBfCngt/16ce425e-4d69-40f6-a65c-756a3ca89ac3.jpg',
  'Ignite V400 Mix':'https://i.ibb.co/Dgscv6j2/4dd8a18a-19be-4f4c-a763-7ea4a7781c2d.jpg',
  'Ignite V500':'https://i.ibb.co/FLSv7JLS/4a769a89-4e09-4a27-ba0c-031af56ab931.jpg',
  'Elfbar BC15K':'https://i.ibb.co/9k03VS9g/5bd8aa95-9482-4716-a723-916628d83202.jpg',
  'Elfbar GH':'https://i.ibb.co/VcmkVYgp/d88a1cbc-5314-4b5d-b338-27ae6cee8686.jpg',
  'Elfbar TE':'https://i.ibb.co/xKfmQywQ/d6afbfff-feb5-4d99-9a65-db80485a66bb.jpg',
  'Elfbar Duke':'https://i.ibb.co/7Jsppzw5/03ca4d8b-e1a8-48a1-a482-33ec8889567e.jpg',
  'Elfbar 40K':'https://i.ibb.co/pBx0JSq7/1801517f-3259-4acf-ad06-86dc0b4832d9.jpg',
  'Elfbar BC45K':'https://i.ibb.co/cc2qN9RK/8124e06f-f090-48d0-9caa-a5e46c42cd0b.jpg',
  'Lost Mary Mixer':'https://i.ibb.co/Y4mXkWG7/6d07a29f-2128-4b6e-9714-43b12df95109.jpg',
  'HOD':'https://i.ibb.co/1GtzgK72/c5e8d3b2-81a8-470e-aeb2-444377cc431b.jpg',
  'Rabbeats RC':'https://i.ibb.co/HDL1BmJ8/4297848e-f924-4c59-9724-8de11330b476.jpg',
  'Black Sheep 55K':'https://i.ibb.co/nNK3ycYD/a5c8a819-a086-4823-9d59-1f6e8f57ff23.jpg'
};

const PRODUTOS = [
  ['Ignite V Nano','1.000 puffs','Ignite',7000,20,0],
  ['Ignite V35','3.500 puffs','Ignite',8000,20,0],
  ['Ignite V55','5.500 puffs','Ignite',12000,20,1],
  ['Ignite V80','8.000 puffs','Ignite',14000,20,0],
  ['Ignite V155','15.500 puffs','Ignite',14000,15,1],
  ['Ignite V40','4.000 puffs','Ignite',17000,15,0],
  ['Ignite V300','30.000 puffs','Ignite',18000,10,1],
  ['Ignite V400 Mix','40.000 puffs','Ignite',18000,8,0],
  ['Ignite V500','50.000 puffs','Ignite',20000,5,1],
  ['Elfbar BC15K','15.000 puffs','Elfbar',12000,15,1],
  ['Elfbar GH','23.000 puffs','Elfbar',15000,12,0],
  ['Elfbar TE','30.000 puffs','Elfbar',15000,10,1],
  ['Elfbar Duke','20.000 puffs','Elfbar',16000,10,0],
  ['Elfbar 40K','40.000 puffs','Elfbar',16000,8,1],
  ['Elfbar BC45K','45.000 puffs','Elfbar',18000,6,0],
  ['Lost Mary Mixer','30.000 puffs','Lost Mary',14000,10,0],
  ['HOD','12.000 puffs','Outras Marcas',14000,12,0],
  ['Rabbeats RC','50.000 puffs','Outras Marcas',16000,8,0],
  ['Black Sheep 55K','55.000 puffs','Outras Marcas',26000,5,1]
];

const SABORES = {
  'Ignite V Nano':'Abacaxi c/ gelo, Maracujá azedo e kiwi, Mentol, Goiaba c/ morango, Morango c/ gelo, Uva c/ gelo, Melancia c/ gelo, Menta c/ gelo, Açaí e uva',
  'Ignite V35':'Menta c/ gelo, Cereja c/ gelo, Mix de frutas, Framboesa azul c/ gelo, Mentol, Uva c/ gelo, Maçã verde pêssego e kiwi, Morango maçã e melancia',
  'Ignite V55':'Uva c/ gelo, Menta de Miami, Morango e kiwi, Melão c/ menta, Uva maçã verde e açaí, Morango e banana, Mix de melão, Melancia c/ gelo, Morango e melancia',
  'Ignite V80':'Uva, Morango e kiwi, Menta c/ gelo, Morango c/ gelo, Maracujá azedo e kiwi, Mentol, Melancia c/ gelo',
  'Ignite V155':'Açaí tropical, Uva c/ gelo, Mirtilo c/ gelo, Maçã verde, Mentol, Morango e banana, Melancia c/ gelo, Mix de melancia, Melancia e fruta do dragão, Abacaxi c/ gelo, Morango e melancia, Maracujá e kiwi, Banana c/ gelo, Menta c/ gelo, Morango e kiwi, Morango c/ gelo',
  'Ignite V40':'Melancia c/ gelo, Morango, Abacaxi, Uva Sakura, Morango e kiwi, Morango maçã e melancia, Uva framboesa azul e limão, Morango e melancia',
  'Ignite V300':'Morango e kiwi, Abacaxi e manga, Abacaxi kiwi e fruta do dragão, Mentol, Uva c/ gelo, Mirtilo c/ gelo, Menta c/ gelo, Morango c/ gelo, Melancia c/ gelo, Abacaxi c/ gelo, Banana c/ gelo, Banana e água de coco, Melão c/ menta, Morango e banana',
  'Ignite V400 Mix':'Menta c/ gelo, Pêssego e uva, Açaí c/ gelo, Melancia e uva, Manga c/ gelo, Pêssego manga e melancia, Mentol, Melão c/ menta, Maracujá e goiaba, Abacaxi c/ gelo, Pêssego c/ gelo, Uva c/ gelo, Morango c/ gelo',
  'Ignite V500':'Maracujá e manga, Mirtilo c/ gelo, Maçã verde pêssego e kiwi, Menta c/ gelo, Morango e melancia, Morango maçã e melancia, Morango e kiwi, Maçã verde, Mix de melancia, Banana e cereja, Morango c/ gelo, Pêssego e uva, Abacaxi c/ gelo, Abacaxi e manga, Kiwi e açaí, Uva c/ gelo, Mentol',
  'Elfbar BC15K':'Abacaxi c/ gelo, Uva Sakura, Maracujá e laranja, Americana, Limonada tropical, Uva Bubbaloo, Morango c/ gelo, Morango e melancia, Pêssego manga e melancia, Melancia c/ gelo, Morango e kiwi, Maçã verde c/ gelo, Manga mágica, Maracujá kiwi e goiaba, Framboesa azul, Menta c/ gelo, Menta de Miami',
  'Elfbar GH':'Maçã verde c/ gelo, Pêssego manga e melancia, Menta de Miami, Uva Sakura, Menta de primavera, Mirtilo e pera, Abacaxi ameixa limão e menta, Morango e banana, Toranja e uva, Framboesa azul, Toranja c/ gelo, Kiwi e fruta do dragão, Morango c/ gelo',
  'Elfbar TE':'Tutti-frutti Bubbaloo, Mirtilo c/ gelo, Morango e cereja, Menta de inverno, Melancia c/ gelo, Açaí e banana, Abacaxi c/ gelo, Abacaxi e manga, Maçã verde c/ gelo, Morango c/ gelo, Menta de Miami, Morango e melancia, Morango banana e fruta do dragão, Morango e pêssego, Maracujá kiwi e goiaba, Mix azedo de frutas, Elf Love',
  'Elfbar Duke':'Mentol, Uva Fanta, Menta c/ gelo, Mirtilo c/ gelo, Framboesa azul, Manga mágica, Melancia e limão c/ gelo, Pêssego manga e melancia, Abacaxi c/ gelo, Tutti-frutti Bubbaloo, Maracujá kiwi e goiaba',
  'Elfbar 40K':'Tigers Blood, Pêssego, Mix azedo de frutas, Baja Splash, Morango banana e fruta do dragão, Morango Spark, Suco de cranberry e abacaxi, Mirtilo c/ gelo, Mix de verão, Morango e melancia, Morango c/ gelo, Cereja Fuse, Maçã azeda c/ gelo, Framboesa azul c/ gelo, Menta de Miami, Melancia c/ gelo, Maçã verde, Morango azedo e fruta do dragão, Manga mágica, Maçã dupla, Uva c/ gelo, Morango e cereja',
  'Elfbar BC45K':'Manga mágica, Mix tropical, Americana c/ gelo, Abacaxi, Mirtilo morango e coco c/ gelo, Melancia c/ gelo, Mix de uva, Mentol, Maçã verde c/ gelo, Menta de Miami, Maracujá kiwi e goiaba',
  'Lost Mary Mixer':'Melancia B-Pop, Mix de menta, Melancia c/ gelo, Framboesa azul c/ gelo, Maçã e uva',
  'HOD':'Uva c/ gelo, Mentol',
  'Rabbeats RC':'Melancia e pêssego, Morango c/ gelo, Fanta morango, Mix de frutas vermelhas, Maracujá kiwi e goiaba, Melancia c/ gelo, Morango e kiwi c/ gelo, Mentol, Banana c/ gelo',
  'Black Sheep 55K':'Aloe e uva, Mirtilo e melancia, Menta intensa (Cool Mint), Menta de Miami, Mix de frutas vermelhas, Maracujá (Passion Fruit), Morango e banana, Melancia com gelo'
};

const total = db.prepare('SELECT COUNT(*) AS n FROM produtos').get().n;
if (total === 0) {
  const ins = db.prepare('INSERT INTO produtos (nome, descricao, categoria, preco_centavos, imagem, estoque, destaque, sabores) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const [nome, desc, cat, preco, est, dest] of PRODUTOS) {
    ins.run(nome, desc, cat, preco, IMAGENS[nome] || '', est, dest, SABORES[nome] || null);
  }
  console.log('✅ ' + PRODUTOS.length + ' produtos inseridos');
}

module.exports = db;
