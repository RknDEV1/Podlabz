#!/bin/bash
set -e
echo "🔧 PODLABZ FIX GERAL"
echo "===================="
cd /workspaces/Podlabz/minha-loja

# ==========================================
# 1. BACKUP
# ==========================================
mkdir -p backups
cp public/style.css backups/style.css.$(date +%s) 2>/dev/null || true
cp public/index.html backups/index.html.$(date +%s) 2>/dev/null || true
cp server.js backups/server.js.$(date +%s) 2>/dev/null || true
echo "✅ 1. Backup feito"

# ==========================================
# 2. LIMPAR ANIMAÇÕES ANTIGAS PESADAS
# ==========================================
python3 << 'PYEOF'
import re
with open('public/style.css') as f: c = f.read()

# Remove todos os blocos antigos de fumaça/partículas
padroes = [
    r'/\* -+ FUMAÇA ANIMADA -+ \*/.*?(?=/\*|$)',
    r'/\* -+ PARTÍCULAS -+ \*/.*?(?=/\*|$)',
    r'/\* =+\s*FUMAÇA LIVRE.*?(?=/\* =|$)',
    r'/\* =+\s*PARTÍCULAS.*?(?=/\* =|$)',
    r'\.smoke-container \{.*?\n\}',
    r'\.smoke \{.*?\n\}',
    r'\.smoke-[0-9] \{.*?\n\}',
    r'@keyframes smoke[0-9] \{.*?\n\}',
    r'@keyframes floatSmoke[0-9] \{.*?\n\}',
    r'\.particles \{.*?\n\}',
    r'\.particles::[a-z]+[^{]*\{.*?\n\}',
    r'@keyframes particles[A-Za-z]* \{.*?\n\}',
]

for p in padroes:
    c = re.sub(p, '', c, flags=re.DOTALL)

with open('public/style.css','w') as f: f.write(c)
print('✅ 2. Animações antigas removidas')
PYEOF

# ==========================================
# 3. ADICIONAR VERSÃO OTIMIZADA (funciona em todos)
# ==========================================
cat >> public/style.css << 'CSSEOF'

/* ============================================
   FUMAÇA OTIMIZADA (funciona em mobile + desktop)
   ============================================ */

.smoke-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  will-change: transform;
}

.smoke {
  position: absolute;
  width: 700px;
  height: 700px;
  border-radius: 50%;
  filter: blur(70px);
  opacity: .12;
  will-change: transform, opacity;
  transform: translate(-50%, -50%);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.smoke-1 {
  background: radial-gradient(circle, rgba(139,92,246,.7), transparent 70%);
  top: 20%; left: 10%;
  animation: smokeA 50s ease-in-out infinite;
}
.smoke-2 {
  background: radial-gradient(circle, rgba(6,182,212,.6), transparent 70%);
  top: 60%; left: 80%;
  animation: smokeB 60s ease-in-out infinite;
}
.smoke-3 {
  background: radial-gradient(circle, rgba(167,139,250,.6), transparent 70%);
  top: 40%; left: 50%;
  animation: smokeC 45s ease-in-out infinite;
}

@keyframes smokeA {
  0%   { transform: translate(-50%,-50%) scale(1); opacity: .08; }
  25%  { transform: translate(20vw, 30vh) scale(1.4); opacity: .18; }
  50%  { transform: translate(60vw, 60vh) scale(1.1); opacity: .14; }
  75%  { transform: translate(20vw, 20vh) scale(1.3); opacity: .16; }
  100% { transform: translate(-50%,-50%) scale(1); opacity: .08; }
}

@keyframes smokeB {
  0%   { transform: translate(-50%,-50%) scale(1); opacity: .1; }
  33%  { transform: translate(-50vw, -30vh) scale(1.3); opacity: .2; }
  66%  { transform: translate(-30vw, 20vh) scale(1.1); opacity: .14; }
  100% { transform: translate(-50%,-50%) scale(1); opacity: .1; }
}

@keyframes smokeC {
  0%   { transform: translate(-50%,-50%) scale(1); opacity: .1; }
  50%  { transform: translate(-20vw, 40vh) scale(1.5); opacity: .2; }
  100% { transform: translate(-50%,-50%) scale(1); opacity: .1; }
}

.particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.particles::before {
  content: '';
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(167,139,250,.7);
  border-radius: 50%;
  box-shadow:
    15vw 25vh 0 0 rgba(167,139,250,.6),
    45vw 65vh 0 1px rgba(6,182,212,.5),
    75vw 15vh 0 0 rgba(255,255,255,.4),
    85vw 85vh 0 1px rgba(139,92,246,.5),
    25vw 85vh 0 0 rgba(167,139,250,.3);
  animation: particlesUp 30s linear infinite;
  will-change: transform;
}

@keyframes particlesUp {
  0%   { transform: translateY(0); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-110vh); opacity: 0; }
}

/* ---------- MOBILE: reduz tudo ---------- */
@media (max-width: 768px) {
  .smoke {
    filter: blur(50px);
    opacity: .06;
  }
  .smoke-2 { display: none; }
  .particles::before { animation-duration: 50s; }
}

/* ---------- MOBILE FRACO: desliga tudo ---------- */
@media (max-width: 480px) {
  .smoke-container,
  .particles {
    display: none !important;
  }
  body::before { display: none; }
}

/* ---------- Acessibilidade ---------- */
@media (prefers-reduced-motion: reduce) {
  .smoke,
  .particles::before {
    animation: none !important;
  }
}
CSSEOF

echo "✅ 3. Fumaça otimizada adicionada"

# ==========================================
# 4. CACHE NO EXPRESS
# ==========================================
python3 << 'PYEOF'
with open('server.js') as f: s = f.read()

if 'maxAge' not in s:
    s = s.replace(
        "app.use(express.static(path.join(__dirname, 'public')));",
        "app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', etag: true }));"
    )
    with open('server.js','w') as f: f.write(s)
    print('✅ 4. Cache adicionado (7 dias)')
else:
    print('ℹ️ 4. Cache já existe')
PYEOF

# ==========================================
# 5. COMPRESSÃO GZIP
# ==========================================
python3 << 'PYEOF'
with open('server.js') as f: s = f.read()

if 'compression' not in s:
    # Adiciona import
    s = s.replace(
        "const express = require('express');",
        "const express = require('express');\nconst compression = require('compression');"
    )
    # Adiciona uso antes do static
    s = s.replace(
        "app.use(express.json());",
        "app.use(compression());\napp.use(express.json());"
    )
    with open('server.js','w') as f: f.write(s)
    print('✅ 5. GZIP ativado')
else:
    print('ℹ️ 5. GZIP já existe')
PYEOF

# ==========================================
# 6. INSTALAR COMPRESSION
# ==========================================
npm install compression --save 2>&1 | tail -2
echo "✅ 6. Compression instalado"

# ==========================================
# 7. VERIFICAÇÕES
# ==========================================
node --check server.js && echo "✅ 7. server.js OK"
node --check db.js && echo "✅ 7. db.js OK"
node --check public/app.js && echo "✅ 7. app.js OK"

# ==========================================
# 8. SALVAR NO GITHUB
# ==========================================
git add . 
git commit -m "Fix: performance mobile + cache + gzip + smoke otimizado" 
git push

echo ""
echo "=========================================="
echo "🎉 TUDO RESOLVIDO!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. Aguardar a Render fazer deploy (3 min)"
echo "2. Testar em: https://podlabz.onrender.com"
echo ""
