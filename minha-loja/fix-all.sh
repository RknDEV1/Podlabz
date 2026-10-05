#!/bin/bash
echo "🔧 PODLABZ - CORRECAO COMPLETA"
echo "================================"
cd /workspaces/Podlabz/minha-loja

# 1. Backup
mkdir -p backups
cp db.js backups/db.js.$(date +%s) 2>/dev/null
cp public/app.js backups/app.js.$(date +%s) 2>/dev/null
echo "✅ 1. Backup feito"

# 2. Verifica db.js
if grep -q "frete_centavos" db.js && grep -q "cpf TEXT" db.js && grep -q "sabor TEXT" db.js; then
  echo "✅ 2. db.js tem todas as colunas"
else
  echo "❌ 2. db.js INCOMPLETO - pare e cole o novo"
  exit 1
fi

# 3. Verifica sintaxe app.js
if node --check public/app.js 2>/dev/null; then
  echo "✅ 3. app.js sintaxe OK"
else
  echo "❌ 3. app.js COM ERRO DE SINTAXE"
  exit 1
fi

# 4. Verifica lib/frete.js
if node --check lib/frete.js 2>/dev/null; then
  echo "✅ 4. lib/frete.js OK"
else
  echo "❌ 4. lib/frete.js QUEBRADO"
  exit 1
fi

# 5. Verifica server.js
if node --check server.js 2>/dev/null; then
  echo "✅ 5. server.js OK"
else
  echo "❌ 5. server.js QUEBRADO"
  exit 1
fi

# 6. Verifica rotas essenciais
ROTAS=$(grep -c "api/frete\|api/pedidos\|api/catalogo\|webhook" server.js)
if [ "$ROTAS" -ge 3 ]; then
  echo "✅ 6. Rotas essenciais presentes ($ROTAS)"
else
  echo "⚠️  6. Faltam rotas no server.js"
fi

# 7. Atualiza better-sqlite3
echo "🔄 7. Atualizando better-sqlite3..."
npm install better-sqlite3@^13.0.0 --save 2>&1 | tail -2

# 8. Confirma versao
VER=$(grep '"better-sqlite3"' package.json)
echo "   $VER"

# 9. Reset banco local
rm -f data/loja.db data/loja.db-*
echo "✅ 9. Banco resetado"

# 10. Recria banco + valida
node -e "
const db = require('./db');
const cols = db.prepare('PRAGMA table_info(pedidos)').all().map(c=>c.name);
const obrig = ['cpf','cep','rua','numero','complemento','bairro','cidade','estado','frete_centavos'];
const falt = obrig.filter(c => !cols.includes(c));
if (falt.length) { console.log('❌ Faltam:', falt.join(', ')); process.exit(1); }
console.log('✅ 10. Todas colunas presentes');
const p = db.prepare('SELECT COUNT(*) AS n FROM produtos').get().n;
const s = db.prepare(\"SELECT COUNT(*) AS n FROM produtos WHERE sabores IS NOT NULL\").get().n;
const i = db.prepare(\"SELECT COUNT(*) AS n FROM produtos WHERE imagem LIKE '%ibb.co%'\").get().n;
console.log('    Produtos: ' + p + ' | Com sabores: ' + s + ' | Com imagens: ' + i);
if (p !== 19 || s !== 19 || i !== 19) { console.log('⚠️  Esperado 19/19/19'); }
"

echo ""
echo "🎉 CORRECAO CONCLUIDA"
echo "Proximo: rodar npm run dev e testar"
