// ===== Estado =====
var carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');
var produtos = [];
var categoriaAtual = 'Todas';
var buscaAtual = '';
var freteAtual = null;
var produtoSaborAtual = null;
var saborSelecionado = null;
var pollingId = null;

function brl(c){ return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function salvar(){ localStorage.setItem('carrinho', JSON.stringify(carrinho)); }
function atualizarQtd(){ var e=document.getElementById('qtd-carrinho'); if(e) e.textContent = carrinho.reduce(function(s,i){return s+i.quantidade;},0); }

// ===== Verificação de idade =====
(function(){
  var m = document.getElementById('modal-idade');
  if(!m) return;
  if(localStorage.getItem('idade-ok')==='sim'){ m.classList.add('escondido'); return; }
  var main=document.querySelector('main'), filt=document.querySelector('.filtros');
  if(main) main.style.display='none'; if(filt) filt.style.display='none';
  var bs=document.getElementById('btn-sim');
  if(bs) bs.onclick=function(){ localStorage.setItem('idade-ok','sim'); m.classList.add('escondido'); if(main) main.style.removeProperty('display'); if(filt) filt.style.removeProperty('display'); };
  var bn=document.getElementById('btn-nao');
  if(bn) bn.onclick=function(){ location.href='https://www.google.com'; };
})();

// ===== Carregar categorias =====
async function carregarCategorias(){
  var el = document.getElementById('categorias'); if(!el) return;
  try{
    var r = await fetch('/api/categorias'); var cats = await r.json();
    var btns = [{categoria:'Todas', total: cats.reduce(function(s,c){return s+c.total;},0)}].concat(cats);
    el.innerHTML = btns.map(function(c){ return '<button data-cat="'+c.categoria+'" class="'+(c.categoria===categoriaAtual?'ativo':'')+'">'+c.categoria+' ('+c.total+')</button>'; }).join('');
    el.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ categoriaAtual=b.dataset.cat; carregarCategorias(); carregarProdutos(); }; });
  }catch(e){ console.error('Erro categorias:', e); }
}

// ===== Carregar produtos =====
async function carregarProdutos(){
  try{
    var p = new URLSearchParams();
    if(buscaAtual) p.set('q', buscaAtual);
    if(categoriaAtual && categoriaAtual !== 'Todas') p.set('categoria', categoriaAtual);
    var o = document.getElementById('ordem'); if(o && o.value) p.set('ordem', o.value);
    var r = await fetch('/api/catalogo?' + p.toString()); produtos = await r.json();
    renderProdutos();
  }catch(e){ console.error('Erro produtos:', e); }
}

function renderProdutos(){
  var el = document.getElementById('produtos'); if(!el) return;
  if(!produtos || produtos.length===0){ el.innerHTML='<p style="grid-column:1/-1;text-align:center;padding:3rem;color:#666">Nenhum produto.</p>'; return; }
  el.innerHTML = produtos.map(function(p){
    var n = p.sabores ? p.sabores.split(',').filter(Boolean).length : 0;
    return '<div class="card" data-id="'+p.id+'">' +
      '<img class="imagem" src="'+(p.imagem||'')+'" alt="'+p.nome+'" loading="lazy">' +
      '<div class="categoria">'+(p.categoria||'Geral')+'</div>' +
      '<h3>'+p.nome+'</h3><small>'+(p.descricao||'')+'</small>' +
      (n>0?'<div style="font-size:.72rem;color:#6b6b6b;margin:.35rem 0">🍓 '+n+' sabores</div>':'') +
      '<div class="preco">'+brl(p.preco_centavos)+'</div>' +
      (p.estoque>0?'<button class="btn-add" data-id="'+p.id+'">Adicionar ao carrinho</button>':'<span class="esgotado">Esgotado</span>') +
      '</div>';
  }).join('');
  el.querySelectorAll('.card').forEach(function(c){ c.onclick=function(e){ if(e.target.closest('.btn-add')) return; location.href='/produto.html?id='+c.dataset.id; }; });
  el.querySelectorAll('.btn-add').forEach(function(b){
    b.onclick=function(e){
      e.stopPropagation();
      var id=Number(b.dataset.id); var p=produtos.find(function(x){return x.id===id;});
      if(!p) return;
      if(p.sabores && p.sabores.trim()){ abrirModalSabor(p); }
      else{ addCarrinho(id,null,1); b.textContent='✅ Adicionado!'; setTimeout(function(){ b.textContent='Adicionar ao carrinho'; },900); }
    };
  });
}

// ===== Modal de sabor =====
function abrirModalSabor(p){
  produtoSaborAtual = p; saborSelecionado = null;
  var t = document.getElementById('sabor-titulo'); if(t) t.textContent = p.nome;
  var pr = document.getElementById('sabor-preco'); if(pr) pr.textContent = brl(p.preco_centavos);
  var lista = p.sabores.split(',').map(function(s){return s.trim();}).filter(Boolean);
  var el = document.getElementById('sabores-opcoes'); if(!el) return;
  el.innerHTML = lista.map(function(s){ return '<div class="sabor-opcao" data-sabor="'+s.replace(/"/g,'&quot;')+'">'+s+'</div>'; }).join('');
  el.querySelectorAll('.sabor-opcao').forEach(function(o){
    o.onclick=function(){
      el.querySelectorAll('.sabor-opcao').forEach(function(x){ x.classList.remove('selecionado'); });
      o.classList.add('selecionado'); saborSelecionado = o.dataset.sabor;
      var bc = document.getElementById('btn-confirmar-sabor'); if(bc) bc.disabled = false;
    };
  });
  var bc = document.getElementById('btn-confirmar-sabor'); if(bc) bc.disabled = true;
  var m = document.getElementById('modal-sabor'); if(m) m.classList.remove('escondido');
}

function addCarrinho(pid, sab, qtd){
  var it = carrinho.find(function(i){ return i.produtoId===pid && (i.sabor||null)===(sab||null); });
  if(it) it.quantidade += qtd; else carrinho.push({produtoId:pid, sabor:sab||null, quantidade:qtd});
  salvar(); atualizarQtd();
}

// ===== Handlers de sabor =====

var bfS = document.getElementById('btn-fechar-sabor');
if(bfS) bfS.onclick = function(){ var m = document.getElementById('modal-sabor'); if(m) m.classList.add('escondido'); };

// ===== Busca e ordem =====
var tmr; var bE = document.getElementById('busca');
if(bE) bE.addEventListener('input', function(e){ clearTimeout(tmr); tmr=setTimeout(function(){ buscaAtual=e.target.value.trim(); carregarProdutos(); }, 300); });
var oE = document.getElementById('ordem');
if(oE) oE.addEventListener('change', carregarProdutos);

// ===== Carrinho =====
function renderCarrinho(){
  var el = document.getElementById('itens-carrinho'); if(!el) return;
  if(carrinho.length===0){
    el.innerHTML = '<p style="color:#a0a0a0">Carrinho vazio.</p>';
    var t = document.getElementById('total'); if(t) t.textContent = brl(0);
    return;
  }
  var soma = 0;
  el.innerHTML = carrinho.map(function(i, idx){
    var p = produtos.find(function(x){ return x.id===i.produtoId; });
    if(!p) return '';
    var sub = p.preco_centavos * i.quantidade; soma += sub;
    return '<div class="item-carrinho"><div><strong>'+p.nome+'</strong>' +
      (i.sabor?'<br><small style="color:#fff;font-weight:600">🍓 '+i.sabor+'</small>':'') +
      '<br><small>'+brl(p.preco_centavos)+' cada</small></div>' +
      '<div style="display:flex;align-items:center;gap:.5rem">' +
      '<button class="btn-qtd" data-idx="'+idx+'" data-delta="-1">−</button>' +
      '<span>'+i.quantidade+'</span>' +
      '<button class="btn-qtd" data-idx="'+idx+'" data-delta="1">+</button>' +
      '<strong>'+brl(sub)+'</strong></div></div>';
  }).join('');
  var t = document.getElementById('total'); if(t) t.textContent = brl(soma + (freteAtual ? freteAtual.preco*100 : 0));
  el.querySelectorAll('.btn-qtd').forEach(function(b){
    b.onclick = function(){
      var idx = Number(b.dataset.idx); var d = Number(b.dataset.delta);
      carrinho[idx].quantidade += d;
      if(carrinho[idx].quantidade <= 0) carrinho.splice(idx, 1);
      salvar(); atualizarQtd(); renderCarrinho();
    };
  });
}

// ===== Abrir/fechar carrinho =====
var bC = document.getElementById('btn-carrinho');
if(bC) bC.onclick = function(){
  var ms = document.getElementById('modal-sabor'); if(ms) ms.classList.add('escondido');
  var m = document.getElementById('modal'); if(m) m.classList.remove('escondido');
  try{ renderCarrinho(); }catch(e){ console.error('Erro carrinho:', e); }
};
var bF = document.getElementById('fechar');
if(bF) bF.onclick = function(){ var m = document.getElementById('modal'); if(m) m.classList.add('escondido'); };

// ===== Frete =====
var btnFrete = document.getElementById('calcular-frete');
if(btnFrete) btnFrete.onclick = async function(){
  var cepEl = document.querySelector('input[name="cep"]');
  var cep = cepEl ? cepEl.value.replace(/\D/g,'') : '';
  if(cep.length !== 8) return alert('Digite um CEP valido.');
  var out = document.getElementById('opcoes-frete'); if(!out) return;
  btnFrete.textContent = 'Calculando...'; btnFrete.disabled = true; out.innerHTML = '';
  try{
    var itens = carrinho.map(function(i){ var p = produtos.find(function(x){ return x.id===i.produtoId; }); return p ? {nome:p.nome, quantidade:i.quantidade, preco_centavos:p.preco_centavos} : null; }).filter(Boolean);
    var r = await fetch('/api/frete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({cep:cep, itens:itens})});
    var opcoes = await r.json();
    if(!Array.isArray(opcoes) || opcoes.length===0){
      out.innerHTML = '<p style="color:#e53935;font-size:.9rem">Nenhuma opcao disponivel.</p>';
    } else {
      freteAtual = opcoes[0];
      var bPix = document.querySelector('#form-checkout button[type=submit]');
      if(bPix){ bPix.disabled = false; bPix.textContent = 'Gerar Pix'; bPix.style.opacity = '1'; bPix.style.cursor = 'pointer'; }
      out.innerHTML = opcoes.map(function(o){
        var obs = o.obs ? '<br><small style="color:#6b6b6b">'+o.obs+'</small>' : '';
        return '<div class="item-carrinho"><div><strong>'+o.transportadora+' — '+o.nome+'</strong><br><small>'+o.prazo+'</small>'+obs+'</div><div><strong>'+brl(o.preco*100)+'</strong></div></div>';
      }).join('');
      renderCarrinho();
    }
  }catch(e){ out.innerHTML = '<p style="color:#e53935;font-size:.9rem">Erro: '+e.message+'</p>'; }
  btnFrete.textContent = 'Calcular Frete'; btnFrete.disabled = false;
};

// ===== Checkout =====
var fC = document.getElementById('form-checkout');
if(fC) fC.onsubmit = async function(e){
  e.preventDefault();
  if(carrinho.length===0) return alert('Carrinho vazio.');
  if(!freteAtual) return alert('Calcule o frete antes de finalizar.');
  var fd = new FormData(e.target);
  var btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Gerando Pix...';
  var tel = (fd.get('telefone')||'').replace(/\D/g,'');
  if(tel.length<=11 && tel.indexOf('55')!==0) tel = '55'+tel;
  try{
    var r = await fetch('/api/pedidos', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        cliente:{nome:fd.get('nome'), cpf:(fd.get('cpf')||'').replace(/\D/g,''), email:fd.get('email'), telefone:tel, cep:(fd.get('cep')||'').replace(/\D/g,''), rua:fd.get('rua'), numero:fd.get('numero'), complemento:fd.get('complemento')||'', bairro:fd.get('bairro'), cidade:fd.get('cidade'), estado:(fd.get('estado')||'').toUpperCase()},
        itens: carrinho, frete: freteAtual
      })
    });
    var d = await r.json();
    if(!r.ok) throw new Error(d.erro||'Erro');
    localStorage.removeItem('carrinho'); carrinho.length = 0; atualizarQtd();
    var m = document.getElementById('modal'); if(m) m.classList.add('escondido');
    var qr = document.getElementById('qrcode-img'); if(qr && d.qrCodeBase64) qr.src = d.qrCodeBase64.indexOf('data:')===0 ? d.qrCodeBase64 : 'data:image/png;base64,'+d.qrCodeBase64;
    var px = document.getElementById('pix-copia-cola'); if(px) px.value = d.pixCopiaECola||'';
    var mp = document.getElementById('modal-pix'); if(mp) mp.classList.remove('escondido');
    
    // Mostra o valor total no modal Pix
    var valorEl = document.getElementById('valor-pix');
    var detalheEl = document.getElementById('detalhe-pix');
    if (valorEl) {
      var totalPix = d.total_centavos || (d.total) || 0;
      valorEl.textContent = brl(totalPix);
    }
    if (detalheEl && freteAtual) {
      var subtotal = totalPix - Math.round(freteAtual.preco * 100);
      detalheEl.textContent = 'Produtos ' + brl(subtotal) + ' + Frete ' + brl(freteAtual.preco * 100);
    }
    if(pollingId) clearInterval(pollingId);
    pollingId = setInterval(async function(){
      var rr = await fetch('/api/pedidos/'+d.pedidoId); var dd = await rr.json();
      if(dd.status==='pago'){ clearInterval(pollingId); var sp = document.getElementById('status-pix'); if(sp) sp.textContent = 'Pagamento confirmado!'; setTimeout(function(){ location.href='/obrigado.html?pedido='+d.pedidoId; }, 1200); }
    }, 4000);
  }catch(err){ alert(err.message); btn.disabled = false; btn.textContent = 'Gerar Pix'; }
};

var bCp = document.getElementById('btn-copiar');
if(bCp) bCp.onclick = async function(){
  var t = document.getElementById('pix-copia-cola').value;
  try{ await navigator.clipboard.writeText(t); bCp.textContent='Copiado!'; setTimeout(function(){ bCp.textContent='Copiar codigo'; }, 1500); }
  catch(e){ document.getElementById('pix-copia-cola').select(); document.execCommand('copy'); }
};

// ===== Init =====
carregarCategorias();
carregarProdutos();
atualizarQtd();

// Busca CEP automaticamente (ViaCEP)
document.addEventListener('input', async function(e) {
  if (e.target.name !== 'cep') return;
  var cep = e.target.value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    var r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
    var d = await r.json();
    if (d.erro) { console.log('CEP nao encontrado'); return; }
    var form = e.target.closest('form');
    if (!form) return;
    if (form.rua && d.logradouro) form.rua.value = d.logradouro;
    if (form.bairro && d.bairro) form.bairro.value = d.bairro;
    if (form.cidade && d.localidade) form.cidade.value = d.localidade;
    if (form.estado && d.uf) form.estado.value = d.uf;
    if (form.numero) form.numero.focus();
    console.log('CEP preenchido:', d.localidade, '/', d.uf);
  } catch(err) {
    console.error('Erro CEP:', err.message);
  }
});

// Handler global (funciona mesmo se o botao for re-renderizado)
document.addEventListener('click', function(e){
  if(!e.target) return;
  if(e.target.id === 'btn-confirmar-sabor'){
    if(!saborSelecionado){ alert('Escolha um sabor primeiro'); return; }
    if(!produtoSaborAtual){ alert('Erro: produto perdido. Feche e tente de novo.'); return; }
    addCarrinho(produtoSaborAtual.id, saborSelecionado, 1);
    var m = document.getElementById('modal-sabor');
    if(m) m.classList.add('escondido');
  }
  if(e.target.id === 'btn-fechar-sabor'){
    var m2 = document.getElementById('modal-sabor');
    if(m2) m2.classList.add('escondido');
  }
});

// ============================================
// MODO VAPOR (#13) — ativa ao abrir modal
// ============================================
var _abrirModalOriginal = null;
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'btn-carrinho') {
    if (window.deviceTier !== 'low') document.body.classList.add('modo-vapor');
  }
  if (e.target && (e.target.id === 'fechar' || e.target.closest('.modal'))) {
    setTimeout(function() {
      var abertos = document.querySelectorAll('.modal:not(.escondido)');
      if (abertos.length === 0) document.body.classList.remove('modo-vapor');
    }, 100);
  }
});

// ============================================
// BOTÃO WHATSAPP FLUTUANTE (#15)
// ============================================
var btnWhats = document.getElementById('btn-whats');
if (btnWhats) {
  btnWhats.onclick = function() {
    var numero = '5579988626620'; // SEU número com DDI
    var msg = encodeURIComponent('Oi! Vim do site Podlabz e quero saber mais sobre os pods.');
    window.open('https://wa.me/' + numero + '?text=' + msg, '_blank');
  };
}

// ============================================
// SONS SUTIS (#14)
// ============================================
var somAtivo = localStorage.getItem('som-ativo') === 'sim';
var btnSom = document.getElementById('btn-som');

function tocarSom(tipo) {
  if (!somAtivo || window.deviceTier === 'low') return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (tipo === 'add') { osc.frequency.value = 880; gain.gain.value = 0.08; }
    else if (tipo === 'remove') { osc.frequency.value = 400; gain.gain.value = 0.06; }
    else if (tipo === 'pix') { osc.frequency.value = 1200; gain.gain.value = 0.1; }
    osc.type = 'sine';
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

if (btnSom) {
  if (somAtivo) btnSom.classList.add('ativo');
  btnSom.textContent = somAtivo ? '🔊' : '🔇';
  btnSom.onclick = function() {
    somAtivo = !somAtivo;
    localStorage.setItem('som-ativo', somAtivo ? 'sim' : 'nao');
    btnSom.textContent = somAtivo ? '🔊' : '🔇';
    btnSom.classList.toggle('ativo', somAtivo);
    if (somAtivo) tocarSom('add');
  };
}

// Hook nos botões de adicionar
document.addEventListener('click', function(e) {
});

// ============================================
// MODO VAPOR (#13) — ativa ao abrir modal
// ============================================
var _abrirModalOriginal = null;
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'btn-carrinho') {
    if (window.deviceTier !== 'low') document.body.classList.add('modo-vapor');
  }
  if (e.target && (e.target.id === 'fechar' || e.target.closest('.modal'))) {
    setTimeout(function() {
      var abertos = document.querySelectorAll('.modal:not(.escondido)');
      if (abertos.length === 0) document.body.classList.remove('modo-vapor');
    }, 100);
  }
});

// ============================================
// BOTÃO WHATSAPP FLUTUANTE (#15)
// ============================================
var btnWhats = document.getElementById('btn-whats');
if (btnWhats) {
  btnWhats.onclick = function() {
    var numero = '5579988626620'; // SEU número com DDI
    var msg = encodeURIComponent('Oi! Vim do site Podlabz e quero saber mais sobre os pods.');
    window.open('https://wa.me/' + numero + '?text=' + msg, '_blank');
  };
}

// ============================================
// SONS SUTIS (#14)
// ============================================
var somAtivo = localStorage.getItem('som-ativo') === 'sim';
var btnSom = document.getElementById('btn-som');

function tocarSom(tipo) {
  if (!somAtivo || window.deviceTier === 'low') return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (tipo === 'add') { osc.frequency.value = 880; gain.gain.value = 0.08; }
    else if (tipo === 'remove') { osc.frequency.value = 400; gain.gain.value = 0.06; }
    else if (tipo === 'pix') { osc.frequency.value = 1200; gain.gain.value = 0.1; }
    osc.type = 'sine';
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

if (btnSom) {
  if (somAtivo) btnSom.classList.add('ativo');
  btnSom.textContent = somAtivo ? '🔊' : '🔇';
  btnSom.onclick = function() {
    somAtivo = !somAtivo;
    localStorage.setItem('som-ativo', somAtivo ? 'sim' : 'nao');
    btnSom.textContent = somAtivo ? '🔊' : '🔇';
    btnSom.classList.toggle('ativo', somAtivo);
    if (somAtivo) tocarSom('add');
  };
}

// Hook nos botões de adicionar
document.addEventListener('click', function(e) {
});

// ============================================
// WHATSAPP — Opção C (principal + outros)
// ============================================
var WHATS_NUMEROS = [
  { numero: '5579988626620', label: 'Suporte Podlabz', desc: 'Clique para conversar', icon: '💬' },
  { numero: '5579998554841', label: 'Suporte Podlabz', desc: 'Clique para conversar', icon: '💬' },
  { numero: '5579998381703', label: 'Suporte Podlabz', desc: 'Clique para conversar', icon: '💬' },
  { numero: '5579999118217', label: 'Suporte Podlabz', desc: 'Clique para conversar', icon: '💬' }
];

var btnWhats = document.getElementById('btn-whats');
var modalWhats = document.getElementById('modal-whats');
var fecharWhats = document.getElementById('fechar-whats');
var btnMais = document.getElementById('whats-mais');
var listaWhats = document.getElementById('whats-lista');
var linkPrincipal = document.getElementById('whats-principal');
var labelPrincipal = document.getElementById('whats-principal-label');

// Configura o principal (primeiro da lista)
function montarPrincipal() {
  var p = WHATS_NUMEROS[0];
  var msg = encodeURIComponent('Oi! Vim do site Podlabz e quero saber mais.');
  linkPrincipal.href = 'https://wa.me/' + p.numero + '?text=' + msg;
  if (labelPrincipal) labelPrincipal.textContent = p.label;
}

// Monta a lista de "outros"
function montarOutros() {
  var outros = WHATS_NUMEROS.slice(1);
  listaWhats.innerHTML = outros.map(function(w) {
    var msg = encodeURIComponent('Oi! Vim do site Podlabz (' + w.label + ')');
    return '<a class="whats-item" href="https://wa.me/' + w.numero + '?text=' + msg + '" target="_blank">' +
      '<span class="icon">' + w.icon + '</span>' +
      '<div><strong>' + w.label + '</strong><small>' + w.desc + '</small></div>' +
      '</a>';
  }).join('');
}

if (btnWhats && modalWhats) {
  montarPrincipal();
  montarOutros();

  btnWhats.onclick = function() {
    modalWhats.classList.remove('escondido');
    listaWhats.classList.add('escondido');
    btnMais.textContent = 'Ver outros números ▾';
  };

  fecharWhats.onclick = function() {
    modalWhats.classList.add('escondido');
  };

  modalWhats.onclick = function(e) {
    if (e.target === modalWhats) modalWhats.classList.add('escondido');
  };

  btnMais.onclick = function() {
    var estaEscondido = listaWhats.classList.contains('escondido');
    if (estaEscondido) {
      listaWhats.classList.remove('escondido');
      btnMais.textContent = 'Esconder ▴';
    } else {
      listaWhats.classList.add('escondido');
      btnMais.textContent = 'Ver outros números ▾';
    }
  };
}

// ============================================
// VOO PRO CARRINHO
// ============================================
function voarProCarrinho(origemEl) {
  if (window.deviceTier === 'low') return;
  var carrinho = document.getElementById('btn-carrinho');
  if (!carrinho || !origemEl) return;

  var origem = origemEl.getBoundingClientRect();
  var destino = carrinho.getBoundingClientRect();

  var bolha = document.createElement('div');
  bolha.className = 'bolha-voo';
  bolha.style.left = (origem.left + origem.width / 2 - 10) + 'px';
  bolha.style.top = (origem.top + origem.height / 2 - 10) + 'px';
  document.body.appendChild(bolha);

  setTimeout(function() {
    bolha.style.left = (destino.left + destino.width / 2 - 10) + 'px';
    bolha.style.top = (destino.top + destino.height / 2 - 10) + 'px';
    bolha.style.transform = 'scale(.4)';
    bolha.style.opacity = '0.5';
  }, 20);

  setTimeout(function() {
    bolha.remove();
    carrinho.classList.add('pulso');
    var contador = document.getElementById('qtd-carrinho');
    if (contador) contador.classList.add('novo');
    setTimeout(function() {
      carrinho.classList.remove('pulso');
      if (contador) contador.classList.remove('novo');
    }, 600);
  }, 750);
}

// Hooks: chama quando adicionar ao carrinho
document.addEventListener('click', function(e) {
  if (!e.target) return;
  if (e.target.classList && e.target.classList.contains('btn-add')) {
    voarProCarrinho(e.target);
  }
  if (e.target.id === 'btn-confirmar-sabor') {
    voarProCarrinho(e.target);
  }
});

// ============================================
// RIPPLE nos botões
// ============================================
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.btn-pagar, .btn-add, .categorias button');
  if (!btn) return;
  var r = document.createElement('span');
  var rect = btn.getBoundingClientRect();
  var size = Math.max(rect.width, rect.height);
  r.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,.3);transform:scale(0);animation:rippleAnim .6s ease-out;pointer-events:none;width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - rect.left - size/2) + 'px;top:' + (e.clientY - rect.top - size/2) + 'px;';
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(r);
  setTimeout(function(){ r.remove(); }, 600);
});

// ============================================
// SCROLL REVEAL
// ============================================
if (window.deviceTier !== 'low' && 'IntersectionObserver' in window) {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visivel');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  // Aplica em cards e elementos específicos após o render
  var observerCards = function() {
    document.querySelectorAll('.card:not(.reveal), section:not(.reveal)').forEach(function(el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 6) * 50 + 'ms';
      observer.observe(el);
    });
  };

  // Observa quando os produtos carregarem
  setTimeout(observerCards, 500);
  setInterval(observerCards, 2000);
}

// ============================================
// CONFETES quando o pagamento for confirmado
// ============================================
function soltarConfetes() {
  if (window.deviceTier === 'low') return;
  var cores = ['#8b5cf6','#06b6d4','#a78bfa','#ffffff','#ec4899'];
  var total = window.deviceTier === 'high' ? 80 : 40;

  for (var i = 0; i < total; i++) {
    (function(idx) {
      setTimeout(function() {
        var c = document.createElement('div');
        c.style.cssText = 'position:fixed;top:-10px;left:' + (Math.random() * 100) + 'vw;width:8px;height:8px;background:' + cores[Math.floor(Math.random()*cores.length)] + ';border-radius:' + (Math.random() > .5 ? '50%' : '2px') + ';z-index:9999;pointer-events:none;will-change:transform;';
        document.body.appendChild(c);
        var duracao = 2000 + Math.random() * 1500;
        var rotacao = Math.random() * 720 - 360;
        var desloc = Math.random() * 200 - 100;
        c.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + desloc + 'px,' + (window.innerHeight + 50) + 'px) rotate(' + rotacao + 'deg)', opacity: 0 }
        ], { duration: duracao, easing: 'cubic-bezier(.4,0,.7,1)' });
        setTimeout(function(){ c.remove(); }, duracao);
      }, idx * 15);
    })(i);
  }
}

// Escuta quando o site muda pra "pago"
var _intervalPago = setInterval(function() {
  var status = document.getElementById('status-pix');
  if (status && /confirmado/i.test(status.textContent) && !status.dataset.confetei) {
    status.dataset.confetei = 'sim';
    soltarConfetes();
  }
}, 1000);

// ============================================
// LOADING SCREEN
// ============================================
window.addEventListener('load', function() {
  setTimeout(function() {
    var l = document.getElementById('loading-screen');
    if (l) l.classList.add('saiu');
  }, 800);
});

// ============================================
// BARRA DE PROGRESSO NO TOPO
// ============================================
(function() {
  var barra = document.getElementById('progress-bar');
  if (!barra) return;
  function atualiza() {
    var h = document.documentElement;
    var total = h.scrollHeight - h.clientHeight;
    var pct = total > 0 ? (h.scrollTop / total) * 100 : 0;
    barra.style.width = pct + '%';
    if (pct >= 99) barra.classList.add('completa');
    else barra.classList.remove('completa');
  }
  window.addEventListener('scroll', atualiza, { passive: true });
  atualiza();
})();

// ============================================
// HEADER SHRINK
// ============================================
(function() {
  var header = document.querySelector('header');
  if (!header) return;
  var ultimo = 0;
  window.addEventListener('scroll', function() {
    var atual = window.scrollY;
    if (atual > 60 && ultimo <= 60) header.classList.add('encolhido');
    else if (atual <= 60 && ultimo > 60) header.classList.remove('encolhido');
    ultimo = atual;
  }, { passive: true });
})();

// ============================================
// TEXT SCRAMBLE no logo
// ============================================
(function() {
  var logo = document.querySelector('.logo-texto');
  if (!logo || window.deviceTier === 'low') return;
  var texto = logo.textContent;
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var iteracao = 0;
  function scramble() {
    logo.textContent = texto.split('').map(function(c, i) {
      if (i < iteracao) return texto[i];
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    if (iteracao >= texto.length) return;
    iteracao += 1/3;
    requestAnimationFrame(scramble);
  }
  setTimeout(scramble, 1200);
})();

// ============================================
// CURSOR DE FUMAÇA (só desktop)
// ============================================
(function() {
  if (window.deviceTier !== 'high') return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  var ultimo = 0;
  document.addEventListener('mousemove', function(e) {
    var agora = Date.now();
    if (agora - ultimo < 50) return;
    ultimo = agora;
    var p = document.createElement('div');
    p.style.cssText = 'position:fixed;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.6),transparent 70%);pointer-events:none;z-index:9998;left:' + (e.clientX-15) + 'px;top:' + (e.clientY-15) + 'px;filter:blur(8px);';
    document.body.appendChild(p);
    p.animate([
      { opacity: .8, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(3) translateY(-30px)' }
    ], { duration: 900, easing: 'ease-out' });
    setTimeout(function() { p.remove(); }, 900);
  });
})();

// ============================================
// 3D TILT nos cards (segue o dedo/mouse)
// ============================================
(function() {
  if (window.deviceTier === 'low') return;
  document.addEventListener('pointermove', function(e) {
    var card = e.target.closest ? e.target.closest('.card') : null;
    if (!card) return;
    var r = card.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - .5;
    var y = (e.clientY - r.top) / r.height - .5;
    var img = card.querySelector('.imagem');
    if (img) {
      img.style.transform = 'perspective(800px) rotateY(' + (x*15) + 'deg) rotateX(' + (-y*15) + 'deg) scale(1.05)';
    }
  }, { passive: true });

  document.addEventListener('pointerout', function(e) {
    var card = e.target.closest ? e.target.closest('.card') : null;
    if (!card) return;
    var img = card.querySelector('.imagem');
    if (img) img.style.transform = '';
  }, { passive: true });
})();

// ============================================
// BOTÃO MAGNÉTICO
// ============================================
(function() {
  if (window.deviceTier !== 'high') return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.addEventListener('mousemove', function(e) {
    var btn = e.target.closest ? e.target.closest('.btn-pagar, .btn-add') : null;
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    var x = (e.clientX - r.left - r.width/2) / r.width;
    var y = (e.clientY - r.top - r.height/2) / r.height;
    btn.style.transform = 'translate(' + (x*6) + 'px,' + (y*6) + 'px) scale(1.03)';
  });
  document.addEventListener('mouseout', function(e) {
    var btn = e.target.closest ? e.target.closest('.btn-pagar, .btn-add') : null;
    if (btn) btn.style.transform = '';
  });
})();

// ============================================
// TOAST
// ============================================
function mostrarToast(msg, tipo) {
  var t = document.createElement('div');
  t.className = 'toast' + (tipo ? ' toast-' + tipo : '');
  t.innerHTML = (tipo === 'sucesso' ? '✅ ' : tipo === 'erro' ? '❌ ' : '💬 ') + msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('visivel'); }, 20);
  setTimeout(function() {
    t.classList.remove('visivel');
    setTimeout(function() { t.remove(); }, 300);
  }, 2500);
}

// Hook nos botões
document.addEventListener('click', function(e) {
  if (e.target.classList && e.target.classList.contains('btn-add')) {
    mostrarToast('Adicionado ao carrinho', 'sucesso');
  }
  if (e.target.id === 'btn-confirmar-sabor') {
    mostrarToast('Sabor escolhido!', 'sucesso');
  }
});

// ============================================
// PARALLAX NAS NUVENS
// ============================================
(function() {
  if (window.deviceTier === 'low') return;
  var nuvens = document.querySelectorAll('.smoke');
  if (!nuvens.length) return;
  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    nuvens.forEach(function(n, i) {
      n.style.marginTop = (y * (i + 1) * 0.03) + 'px';
    });
  }, { passive: true });
})();

// ============================================
// CONTADOR ANIMADO (admin)
// ============================================
function animarNumero(el, para, prefixo, tempo) {
  tempo = tempo || 1500;
  var inicio = 0;
  var passo = para / (tempo / 16);
  function rodar() {
    inicio += passo;
    if (inicio >= para) {
      el.textContent = (prefixo || '') + para.toLocaleString('pt-BR');
      return;
    }
    el.textContent = (prefixo || '') + Math.floor(inicio).toLocaleString('pt-BR');
    requestAnimationFrame(rodar);
  }
  rodar();
}

// ============================================
// ENTRADA ANIMADA DOS CARDS
// ============================================
var _obsCards = new MutationObserver(function() {
  document.querySelectorAll('.card:not(.entrando):not(.processado)').forEach(function(c) {
    c.classList.add('processado', 'entrando');
  });
});
_obsCards.observe(document.body, { childList: true, subtree: true });

// ============================================
// BOTÃO "VOLTAR AO TOPO" (aparece ao rolar)
// ============================================
(function() {
  var btn = document.createElement('button');
  btn.id = 'btn-topo';
  btn.innerHTML = '↑';
  btn.style.cssText = 'position:fixed;bottom:90px;left:20px;width:44px;height:44px;border-radius:50%;background:rgba(20,20,25,.9);border:1px solid #2a2a35;color:#fff;font-size:1.2rem;cursor:pointer;z-index:100;opacity:0;visibility:hidden;transition:all .3s;backdrop-filter:blur(10px);';
  btn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  document.body.appendChild(btn);

  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    if (y > 400) { btn.style.opacity = '1'; btn.style.visibility = 'visible'; }
    else { btn.style.opacity = '0'; btn.style.visibility = 'hidden'; }
  }, { passive: true });
})();

// ============================================
// GUARDA-CORPO: bloqueia efeitos pesados em MID
// ============================================
(function() {
  var t = window.deviceTier;
  if (t === 'mid') {
    // Em MID, desliga cursor de fumaça e botão magnético (mas mantém voo, scroll reveal, confete)
    document.querySelectorAll = document.querySelectorAll.bind(document);
  }
})();

// Confete adaptado: menos partículas em MID
var _soltarConfetes = window.soltarConfetes;
window.soltarConfetes = function() {
  var t = window.deviceTier;
  if (t === 'low') return;
  var cores = ['#8b5cf6','#06b6d4','#a78bfa','#ffffff','#ec4899'];
  var total = t === 'high' ? 80 : (t === 'mid' ? 35 : 0);
  if (!total) return;

  for (var i = 0; i < total; i++) {
    (function(idx) {
      setTimeout(function() {
        var c = document.createElement('div');
        c.style.cssText = 'position:fixed;top:-10px;left:' + (Math.random()*100) + 'vw;width:8px;height:8px;background:' + cores[Math.floor(Math.random()*cores.length)] + ';border-radius:' + (Math.random()>.5?'50%':'2px') + ';z-index:9999;pointer-events:none;will-change:transform;';
        document.body.appendChild(c);
        var dur = 1800 + Math.random()*1200;
        var rot = Math.random()*720-360;
        var desl = Math.random()*200-100;
        c.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + desl + 'px,' + (window.innerHeight+50) + 'px) rotate(' + rot + 'deg)', opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.4,0,.7,1)' });
        setTimeout(function(){ c.remove(); }, dur);
      }, idx * 20);
    })(i);
  }
};
