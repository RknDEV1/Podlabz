function $(id){ return document.getElementById(id); }
function brl(c){ return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function dataBR(s){ if(!s) return '—'; try{return new Date(s.replace(' ','T')+'Z').toLocaleString('pt-BR');}catch(e){return s;} }

function mostrarLogin(){
  $('tela-login').classList.remove('escondido');
  $('painel').classList.add('escondido');
}
function mostrarPainel(){
  $('tela-login').classList.add('escondido');
  $('painel').classList.remove('escondido');
  carregarPedidos();
}

/* ---------- LOGIN ---------- */
async function fazerLogin(){
  var senha = $('senha').value;
  var msg = $('msg');
  msg.style.color = '#e53935';
  msg.textContent = '';
  if (!senha) { msg.textContent = 'Digite a senha'; return; }
  $('btn-login').disabled = true;
  $('btn-login').textContent = 'Entrando...';
  try {
    var r = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: senha })
    });
    var d = await r.json();
    if (!r.ok) { msg.textContent = d.erro || 'Erro'; }
    else { mostrarPainel(); }
  } catch(e) { msg.textContent = 'Erro de conexão'; }
  $('btn-login').disabled = false;
  $('btn-login').textContent = 'Entrar';
}

async function fazerLogout(){
  try { await fetch('/api/admin/logout', { method: 'POST' }); } catch(e) {}
  mostrarLogin();
}

/* ---------- PEDIDOS ---------- */
async function carregarPedidos(){
  var el = $('tab-pedidos');
  el.innerHTML = '<div class="vazio">Carregando...</div>';
  try {
    var r = await fetch('/api/admin/pedidos');
    if (r.status === 401) { mostrarLogin(); return; }
    var lista = await r.json();
    if (!Array.isArray(lista) || lista.length === 0) {
      el.innerHTML = '<div class="vazio">Nenhum pedido ainda.</div>';
      return;
    }
    el.innerHTML = lista.map(function(p){
      return '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:start;gap:1rem">' +
          '<div>' +
            '<h3>Pedido #' + p.id + '</h3>' +
            '<div class="meta">' + (p.cliente_nome||'') + ' · ' + (p.cliente_telefone||'') + '<br>' + (p.cliente_email||'') + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<span class="tag ' + p.status + '">' + p.status + '</span>' +
            '<div style="font-weight:800;font-size:1.1rem;margin-top:.35rem">' + brl(p.total_centavos) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="meta" style="margin-top:.75rem"><strong>Entrega:</strong> ' + (p.endereco||'—') + '</div>' +
        '<div class="meta"><strong>Criado:</strong> ' + dataBR(p.criado_em) + '</div>' +
        '<div class="acoes">' +
          '<button class="ok" onclick="mudarStatus(' + p.id + ',\'enviado\')">Marcar enviado</button>' +
          '<button class="perigo" onclick="mudarStatus(' + p.id + ',\'cancelado\')">Cancelar</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<div class="vazio">Erro ao carregar pedidos.</div>';
  }
}

async function mudarStatus(id, status){
  if (!confirm('Mudar pedido #' + id + ' para ' + status + '?')) return;
  try {
    await fetch('/api/admin/pedidos/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
    });
    carregarPedidos();
  } catch(e) { alert('Erro: ' + e.message); }
}

/* ---------- PRODUTOS ---------- */
async function carregarProdutos(){
  var el = $('tab-produtos');
  el.innerHTML = '<div class="vazio">Carregando...</div>';
  try {
    var r = await fetch('/api/admin/produtos');
    if (r.status === 401) { mostrarLogin(); return; }
    var lista = await r.json();
    if (!Array.isArray(lista) || lista.length === 0) {
      el.innerHTML = '<div class="vazio">Nenhum produto.</div>';
      return;
    }
    el.innerHTML = lista.map(function(p){
      return '<div class="card">' +
        '<h3>' + p.nome + '</h3>' +
        '<div class="meta">' + (p.categoria||'Geral') + ' · Estoque: ' + p.estoque + ' · ' + brl(p.preco_centavos) + '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<div class="vazio">Erro ao carregar produtos.</div>';
  }
}

/* ---------- TABS ---------- */
document.querySelectorAll('.tabs button').forEach(function(b){
  b.onclick = function(){
    document.querySelectorAll('.tabs button').forEach(function(x){ x.classList.remove('ativo'); });
    b.classList.add('ativo');
    var t = b.dataset.tab;
    $('tab-pedidos').classList.toggle('escondido', t !== 'pedidos');
    $('tab-produtos').classList.toggle('escondido', t !== 'produtos');
    if (t === 'pedidos') carregarPedidos(); else carregarProdutos();
  };
});

/* ---------- INIT ---------- */
$('btn-login').onclick = fazerLogin;
$('senha').addEventListener('keypress', function(e){ if (e.key === 'Enter') fazerLogin(); });
$('btn-sair').onclick = fazerLogout;

async function verificarLogin(){
  try {
    var r = await fetch('/api/admin/me');
    if (r.ok) mostrarPainel(); else mostrarLogin();
  } catch(e) { mostrarLogin(); }
}
verificarLogin();
