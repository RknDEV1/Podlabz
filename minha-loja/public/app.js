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
  { numero: '5579988626620', label: 'Rakinin',    desc: 'Atendimento geral', icon: '💬' },
  { numero: '5579998554841', label: 'Guido',      desc: 'Vendas',            icon: '🛒' },
  { numero: '5579998381703', label: 'Gabrielle',  desc: 'Suporte',           icon: '🛠️' },
  { numero: '5579999118217', label: 'Yasmin',     desc: 'Entregas',          icon: '🚚' }
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
