var token = localStorage.getItem('admin-token') || '';
var pedidos = [], produtos = [];
var filtroStatus = '', buscaPedidos = '', buscaProdutos = '';

function brl(c){ return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function esc(s){ return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function dataBR(s){
  if(!s) return '—';
  try { return new Date(s.replace(' ','T')+'Z').toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch(e){ return s; }
}

function api(path, opts){
  opts = opts || {};
  opts.headers = opts.headers || {};
  opts.headers['Authorization'] = 'Bearer ' + token;
  if(opts.body && typeof opts.body === 'object'){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  return fetch(path, opts).then(function(r){
    if(r.status === 401){ logout(); throw new Error('Sessão expirada'); }
    return r.json();
  });
}

/* ---------- LOGIN ---------- */
function login(){
  var senha = document.getElementById('senha').value;
  var err = document.getElementById('erro-login');
  err.textContent = '';
  fetch('/api/admin/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({senha:senha})})
    .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, d:d}; }); })
    .then(function(res){
      if(!res.ok){ err.textContent = res.d.erro || 'Erro'; return; }
      token = res.d.token;
      localStorage.setItem('admin-token', token);
      mostrarPainel();
    })
    .catch(function(){ err.textContent = 'Erro de conexão'; });
}

function logout(){
  token = '';
  localStorage.removeItem('admin-token');
  document.getElementById('tela-login').classList.remove('escondido');
  document.getElementById('painel').classList.add('escondido');
}

function mostrarPainel(){
  document.getElementById('tela-login').classList.add('escondido');
  document.getElementById('painel').classList.remove('escondido');
  carregarPedidos();
}

/* ---------- PEDIDOS ---------- */
async function carregarPedidos(){
  try {
    pedidos = await api('/api/admin/pedidos');
    renderStats();
    renderPedidos();
  } catch(e){ console.error(e); }
}

function renderStats(){
  var total = pedidos.length;
  var porStatus = {};
  var faturado = 0;
  pedidos.forEach(function(p){
    porStatus[p.status] = (porStatus[p.status]||0) + 1;
    if(p.status === 'pago' || p.status === 'enviado') faturado += p.total_centavos;
  });
  document.getElementById('stats').innerHTML =
    '<div class="stat"><div class="stat-num">'+total+'</div><div class="stat-lbl">Pedidos</div></div>' +
    '<div class="stat"><div class="stat-num">'+brl(faturado)+'</div><div class="stat-lbl">Faturado</div></div>' +
    '<div class="stat"><div class="stat-num">'+(porStatus.pago||0)+'</div><div class="stat-lbl">A separar</div></div>' +
    '<div class="stat"><div class="stat-num">'+(porStatus.enviado||0)+'</div><div class="stat-lbl">Enviados</div></div>';
}

function renderPedidos(){
  var el = document.getElementById('lista-pedidos');
  var lista = pedidos.slice();
  if(filtroStatus) lista = lista.filter(function(p){ return p.status === filtroStatus; });
  if(buscaPedidos){
    var q = buscaPedidos.toLowerCase();
    lista = lista.filter(function(p){
      return String(p.id).indexOf(q) !== -1 ||
             (p.cliente_nome||'').toLowerCase().indexOf(q) !== -1 ||
             (p.cliente_telefone||'').toLowerCase().indexOf(q) !== -1 ||
             (p.cliente_email||'').toLowerCase().indexOf(q) !== -1;
    });
  }
  if(!lista.length){ el.innerHTML = '<div class="vazio">Nenhum pedido encontrado.</div>'; return; }
  el.innerHTML = lista.map(function(p){
    return '<div class="card-pedido">' +
      '<div class="card-pedido-top">' +
        '<div>' +
          '<div class="pedido-id">#' + p.id + '</div>' +
          '<div class="pedido-cliente">' + esc(p.cliente_nome) + '</div>' +
          '<div class="pedido-contato">' + esc(p.cliente_telefone) + ' · ' + esc(p.cliente_email) + '</div>' +
        '</div>' +
        '<div class="pedido-direita">' +
          '<span class="tag tag-' + p.status + '">' + p.status + '</span>' +
          '<div class="pedido-valor">' + brl(p.total_centavos) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-pedido-meta">' +
        '<div><strong>Data:</strong> ' + dataBR(p.criado_em) + '</div>' +
        '<div><strong>Entrega:</strong> ' + esc(p.endereco) + '</div>' +
      '</div>' +
      '<div class="card-pedido-actions">' +
        '<button class="btn-acao" onclick="abrirPedido(' + p.id + ')">Ver detalhes</button>' +
        (p.status !== 'enviado' ? '<button class="btn-acao btn-ok" onclick="mudarStatus(' + p.id + ',\'enviado\')">Marcar enviado</button>' : '') +
        (p.status === 'pago' ? '<button class="btn-acao" onclick="mudarStatus(' + p.id + ',\'pendente\')">Voltar p/ pendente</button>' : '') +
        (p.status !== 'cancelado' ? '<button class="btn-acao btn-perigo" onclick="mudarStatus(' + p.id + ',\'cancelado\')">Cancelar</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

async function abrirPedido(id){
  try {
    var p = await api('/api/admin/pedidos/' + id);
    document.getElementById('modal-pedido-titulo').textContent = 'Pedido #' + p.id;

    var itensHtml = (p.itens||[]).map(function(i){
      return '<div class="item-linha"><div><strong>' + i.quantidade + 'x ' + esc(i.nome) + '</strong>' +
        (i.sabor ? '<div class="sabor-tag">🍓 ' + esc(i.sabor) + '</div>' : '') +
        '</div><div>' + brl(i.preco_centavos * i.quantidade) + '</div></div>';
    }).join('');

    document.getElementById('modal-pedido-conteudo').innerHTML =
      '<div class="bloco-modal"><h3>Cliente</h3>' +
        '<p><strong>' + esc(p.cliente_nome) + '</strong></p>' +
        '<p>' + esc(p.cliente_telefone) + '</p>' +
        '<p>' + esc(p.cliente_email) + '</p></div>' +
      '<div class="bloco-modal"><h3>Endereço de entrega</h3>' +
        '<p>' + esc(p.endereco) + '</p></div>' +
      '<div class="bloco-modal"><h3>Itens do pedido</h3>' +
        (itensHtml || '<p>Sem itens</p>') +
        '<div class="total-linha"><strong>Total</strong><strong>' + brl(p.total_centavos) + '</strong></div></div>' +
      '<div class="bloco-modal"><h3>Status</h3>' +
        '<p><span class="tag tag-' + p.status + '">' + p.status + '</span></p>' +
        '<p style="color:var(--txtf);font-size:.8rem;margin-top:.5rem">Criado em ' + dataBR(p.criado_em) + '</p>' +
        (p.pago_em ? '<p style="color:var(--txtf);font-size:.8rem">Pago em ' + dataBR(p.pago_em) + '</p>' : '') +
      '</div>';

    document.getElementById('modal-pedido').classList.remove('escondido');
  } catch(e){ console.error(e); }
}

async function mudarStatus(id, status){
  if(status === 'cancelado' && !confirm('Cancelar este pedido?')) return;
  try {
    await api('/api/admin/pedidos/' + id, {method:'PATCH', body:{status:status}});
    carregarPedidos();
  } catch(e){ alert('Erro: ' + e.message); }
}

/* ---------- PRODUTOS ---------- */
async function carregarProdutos(){
  try {
    produtos = await api('/api/admin/produtos');
    renderProdutos();
  } catch(e){ console.error(e); }
}

function renderProdutos(){
  var el = document.getElementById('lista-produtos');
  var lista = produtos.slice();
  if(buscaProdutos){
    var q = buscaProdutos.toLowerCase();
    lista = lista.filter(function(p){
      return (p.nome||'').toLowerCase().indexOf(q) !== -1 || (p.categoria||'').toLowerCase().indexOf(q) !== -1;
    });
  }
  if(!lista.length){ el.innerHTML = '<div class="vazio">Nenhum produto encontrado.</div>'; return; }
  el.innerHTML = lista.map(function(p){
    var n = p.sabores ? p.sabores.split(',').filter(Boolean).length : 0;
    return '<div class="card-produto">' +
      '<img src="' + esc(p.imagem||'') + '" onerror="this.style.background=\'#1a1a1a\';this.src=\'\'">' +
      '<div class="produto-info">' +
        '<div class="produto-cat">' + esc(p.categoria||'Geral') + '</div>' +
        '<h3>' + esc(p.nome) + '</h3>' +
        '<div class="produto-desc">' + esc(p.descricao||'') + '</div>' +
        '<div class="produto-meta">' +
          '<span class="preco">' + brl(p.preco_centavos) + '</span>' +
          '<span class="estoque' + (p.estoque===0?' zero':'') + '">' + p.estoque + ' em estoque</span>' +
        '</div>' +
        (n > 0 ? '<div class="produto-sabores">🍓 ' + n + ' sabores</div>' : '') +
        (p.destaque ? '<div class="badge-destaque">★ DESTAQUE</div>' : '') +
        '<div class="produto-actions">' +
          '<button class="btn-acao btn-ok" onclick="abrirEdicao(' + p.id + ')">Editar</button>' +
          '<button class="btn-acao btn-perigo" onclick="apagarProduto(' + p.id + ')">Apagar</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function abrirEdicao(id){
  var p = produtos.find(function(x){ return x.id === id; });
  if(!p) return;
  document.getElementById('modal-titulo').textContent = 'Editar produto';
  document.getElementById('produto-id').value = p.id;
  document.getElementById('p-nome').value = p.nome || '';
  document.getElementById('p-categoria').value = p.categoria || '';
  document.getElementById('p-descricao').value = p.descricao || '';
  document.getElementById('p-preco').value = (p.preco_centavos / 100).toFixed(2);
  document.getElementById('p-estoque').value = p.estoque || 0;
  document.getElementById('p-imagem').value = p.imagem || '';
  document.getElementById('p-sabores').value = p.sabores || '';
  document.getElementById('p-destaque').checked = p.destaque == 1;
  document.getElementById('modal-produto').classList.remove('escondido');
}

function abrirNovo(){
  document.getElementById('modal-titulo').textContent = 'Novo produto';
  document.getElementById('produto-id').value = '';
  document.getElementById('form-produto').reset();
  document.getElementById('modal-produto').classList.remove('escondido');
}

async function salvarProduto(e){
  e.preventDefault();
  var id = document.getElementById('produto-id').value;
  var body = {
    nome: document.getElementById('p-nome').value,
    categoria: document.getElementById('p-categoria').value,
    descricao: document.getElementById('p-descricao').value,
    preco_centavos: Math.round(parseFloat(document.getElementById('p-preco').value) * 100),
    estoque: parseInt(document.getElementById('p-estoque').value),
    imagem: document.getElementById('p-imagem').value,
    sabores: document.getElementById('p-sabores').value,
    destaque: document.getElementById('p-destaque').checked ? 1 : 0
  };
  try {
    if(id) await api('/api/admin/produtos/' + id, {method:'PATCH', body:body});
    else await api('/api/admin/produtos', {method:'POST', body:body});
    document.getElementById('modal-produto').classList.add('escondido');
    carregarProdutos();
  } catch(e){ alert('Erro ao salvar: ' + e.message); }
}

async function apagarProduto(id){
  if(!confirm('Apagar este produto? Essa ação não pode ser desfeita.')) return;
  try {
    await api('/api/admin/produtos/' + id, {method:'DELETE'});
    carregarProdutos();
  } catch(e){ alert('Erro: ' + e.message); }
}

/* ---------- INIT ---------- */
document.getElementById('btn-login').onclick = login;
document.getElementById('senha').addEventListener('keypress', function(e){ if(e.key === 'Enter') login(); });
document.getElementById('btn-sair').onclick = logout;
document.getElementById('btn-novo-produto').onclick = abrirNovo;
document.getElementById('form-produto').onsubmit = salvarProduto;
document.getElementById('btn-cancelar-modal').onclick = function(){ document.getElementById('modal-produto').classList.add('escondido'); };
document.getElementById('btn-fechar-pedido').onclick = function(){ document.getElementById('modal-pedido').classList.add('escondido'); };

document.querySelectorAll('.tabs button').forEach(function(b){
  b.onclick = function(){
    document.querySelectorAll('.tabs button').forEach(function(x){ x.classList.remove('ativo'); });
    b.classList.add('ativo');
    var tab = b.dataset.tab;
    document.getElementById('tab-pedidos').classList.toggle('escondido', tab !== 'pedidos');
    document.getElementById('tab-produtos').classList.toggle('escondido', tab !== 'produtos');
    if(tab === 'pedidos') carregarPedidos(); else carregarProdutos();
  };
});

document.getElementById('busca-pedidos').addEventListener('input', function(e){ buscaPedidos = e.target.value.trim(); renderPedidos(); });
document.getElementById('filtro-status').addEventListener('change', function(e){ filtroStatus = e.target.value; renderPedidos(); });
document.getElementById('busca-produtos').addEventListener('input', function(e){ buscaProdutos = e.target.value.trim(); renderProdutos(); });

if(token) mostrarPainel();
