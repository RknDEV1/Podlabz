(function(){
  var m=document.getElementById('modal-idade');
  if(!m)return;
  if(localStorage.getItem('idade-ok')==='sim'){m.classList.add('escondido');return;}
  var main=document.querySelector('main'),filt=document.querySelector('.filtros');
  if(main)main.style.display='none';if(filt)filt.style.display='none';
  var bs=document.getElementById('btn-sim');
  if(bs)bs.onclick=function(){localStorage.setItem('idade-ok','sim');m.classList.add('escondido');if(main)main.style.removeProperty('display');if(filt)filt.style.removeProperty('display');};
  var bn=document.getElementById('btn-nao');
  if(bn)bn.onclick=function(){location.href='https://www.google.com';};
})();

var carrinho=JSON.parse(localStorage.getItem('carrinho')||'[]');
var produtos=[],categoriaAtual='Todas',buscaAtual='',pollingId=null,produtoSaborAtual=null,saborSelecionado=null;

function brl(c){return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function salvar(){localStorage.setItem('carrinho',JSON.stringify(carrinho));}
function atualizarQtd(){var e=document.getElementById('qtd-carrinho');if(e)e.textContent=carrinho.reduce(function(s,i){return s+i.quantidade;},0);}

async function carregarCategorias(){
  var el=document.getElementById('categorias');if(!el)return;
  try{
    var res=await fetch('/api/categorias');var cats=await res.json();
    var all={categoria:'Todas',total:0};
    cats.forEach(function(c){all.total+=c.total;});
    var btns=[all].concat(cats);
    el.innerHTML=btns.map(function(c){return '<button data-cat="'+c.categoria+'" class="'+(c.categoria===categoriaAtual?'ativo':'')+'">'+c.categoria+' ('+c.total+')</button>';}).join('');
    el.querySelectorAll('button').forEach(function(b){b.onclick=function(){categoriaAtual=b.dataset.cat;carregarCategorias();carregarProdutos();};});
  }catch(e){console.error(e);}
}

async function carregarProdutos(){
  try{
    var p=new URLSearchParams();
    if(buscaAtual)p.set('q',buscaAtual);
    if(categoriaAtual&&categoriaAtual!=='Todas')p.set('categoria',categoriaAtual);
    var o=document.getElementById('ordem');if(o&&o.value)p.set('ordem',o.value);
    var r=await fetch('/api/catalogo?'+p.toString());
    produtos=await r.json();
    renderProdutos();
  }catch(e){console.error(e);}
}

function renderProdutos(){
  var el=document.getElementById('produtos');if(!el)return;
  if(!produtos||produtos.length===0){el.innerHTML='<p style="grid-column:1/-1;text-align:center;padding:3rem;color:#666">Nenhum produto.</p>';return;}
  el.innerHTML=produtos.map(function(p){
    var n=p.sabores?p.sabores.split(',').filter(Boolean).length:0;
    return '<div class="card" data-id="'+p.id+'">'+
      '<img class="imagem" src="'+(p.imagem||'')+'" alt="'+p.nome+'" loading="lazy" decoding="async" fetchpriority="low">'+
      '<div class="categoria">'+(p.categoria||'Geral')+'</div>'+
      '<h3>'+p.nome+'</h3><small>'+(p.descricao||'')+'</small>'+
      (n>0?'<div style="font-size:.72rem;color:#6b6b6b;margin:.35rem 0">🍓 '+n+' sabores</div>':'')+
      '<div class="preco">'+brl(p.preco_centavos)+'</div>'+
      (p.estoque>0?'<button class="btn-add" data-id="'+p.id+'">Adicionar ao carrinho</button>':'<span class="esgotado">Esgotado</span>')+
      '</div>';
  }).join('');
  el.querySelectorAll('.card').forEach(function(c){c.onclick=function(e){if(e.target.closest('.btn-add'))return;location.href='/produto.html?id='+c.dataset.id;};});
  el.querySelectorAll('.btn-add').forEach(function(b){
    b.onclick=function(e){
      e.stopPropagation();
      var id=Number(b.dataset.id);
      var p=produtos.find(function(x){return x.id===id;});
      if(!p)return;
      if(p.sabores&&p.sabores.trim()){abrirModalSabor(p);}
      else{addCarrinho(id,null,1);b.textContent='✅ Adicionado!';setTimeout(function(){b.textContent='Adicionar ao carrinho';},900);}
    };
  });
}

function abrirModalSabor(p){
  produtoSaborAtual=p;saborSelecionado=null;
  var t=document.getElementById('sabor-titulo');if(t)t.textContent=p.nome;
  var pr=document.getElementById('sabor-preco');if(pr)pr.textContent=brl(p.preco_centavos);
  var lista=p.sabores.split(',').map(function(s){return s.trim();}).filter(Boolean);
  var el=document.getElementById('sabores-opcoes');
  if(!el){addCarrinho(p.id,lista[0],1);return;}
  el.innerHTML=lista.map(function(s){return '<div class="sabor-opcao" data-sabor="'+s.replace(/"/g,'&quot;')+'">'+s+'</div>';}).join('');
  el.querySelectorAll('.sabor-opcao').forEach(function(o){
    o.onclick=function(){
      el.querySelectorAll('.sabor-opcao').forEach(function(x){x.classList.remove('selecionado');});
      o.classList.add('selecionado');saborSelecionado=o.dataset.sabor;
      var bc=document.getElementById('btn-confirmar-sabor');if(bc)bc.disabled=false;
    };
  });
  var bc=document.getElementById('btn-confirmar-sabor');if(bc)bc.disabled=true;
  var m=document.getElementById('modal-sabor');if(m)m.classList.remove('escondido');
}

function addCarrinho(pid,sab,qtd){
  var it=carrinho.find(function(i){return i.produtoId===pid&&(i.sabor||null)===(sab||null);});
  if(it)it.quantidade+=qtd;else carrinho.push({produtoId:pid,sabor:sab||null,quantidade:qtd});
  salvar();atualizarQtd();
}

document.addEventListener('click',function(e){
  if(e.target.id==='btn-confirmar-sabor'){
    if(!saborSelecionado||!produtoSaborAtual)return;
    addCarrinho(produtoSaborAtual.id,saborSelecionado,1);
    var m=document.getElementById('modal-sabor');if(m)m.classList.add('escondido');
  }
  if(e.target.id==='btn-fechar-sabor'){
    var m=document.getElementById('modal-sabor');if(m)m.classList.add('escondido');
  }
});

var tmr;
var bE=document.getElementById('busca');
if(bE)bE.addEventListener('input',function(e){clearTimeout(tmr);tmr=setTimeout(function(){buscaAtual=e.target.value.trim();carregarProdutos();},300);});
var oE=document.getElementById('ordem');if(oE)oE.addEventListener('change',carregarProdutos);

function renderCarrinho(){
  var el=document.getElementById('itens-carrinho');if(!el)return;
  if(carrinho.length===0){el.innerHTML='<p style="color:#a0a0a0">Carrinho vazio.</p>';var t=document.getElementById('total');if(t)t.textContent=brl(0);return;}
  var total=0;
  el.innerHTML=carrinho.map(function(i,idx){
    var p=produtos.find(function(x){return x.id===i.produtoId;});if(!p)return '';
    var sub=p.preco_centavos*i.quantidade;total+=sub;
    return '<div class="item-carrinho"><div><strong>'+p.nome+'</strong>'+(i.sabor?'<br><small style="color:#fff;font-weight:600">🍓 '+i.sabor+'</small>':'')+'<br><small>'+brl(p.preco_centavos)+' cada</small></div><div style="display:flex;align-items:center;gap:.5rem"><button class="btn-qtd" data-idx="'+idx+'" data-delta="-1">−</button><span>'+i.quantidade+'</span><button class="btn-qtd" data-idx="'+idx+'" data-delta="1">+</button><strong>'+brl(sub)+'</strong></div></div>';
  }).join('');
  var t=document.getElementById('total');if(t)t.textContent=brl(total);
  el.querySelectorAll('.btn-qtd').forEach(function(b){b.onclick=function(){var i=Number(b.dataset.idx),d=Number(b.dataset.delta);carrinho[i].quantidade+=d;if(carrinho[i].quantidade<=0)carrinho.splice(i,1);salvar();atualizarQtd();renderCarrinho();};});
}

var bC=document.getElementById('btn-carrinho');
if(bC)bC.onclick=function(){renderCarrinho();var m=document.getElementById('modal');if(m)m.classList.remove('escondido');};
var bF=document.getElementById('fechar');
if(bF)bF.onclick=function(){var m=document.getElementById('modal');if(m)m.classList.add('escondido');};

var fC=document.getElementById('form-checkout');
if(fC)fC.onsubmit=async function(e){
  e.preventDefault();
  if(carrinho.length===0)return alert('Carrinho vazio.');
  var fd=new FormData(e.target);var btn=e.target.querySelector('button[type=submit]');
  btn.disabled=true;btn.textContent='Gerando Pix...';
  var tel=(fd.get('telefone')||'').replace(/\D/g,'');
  if(tel.length<=11&&tel.indexOf('55')!==0)tel='55'+tel;
  try{
    var r=await fetch('/api/pedidos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cliente:{nome:fd.get('nome'),email:fd.get('email'),telefone:tel,endereco:fd.get('endereco')},itens:carrinho})});
    var d=await r.json();if(!r.ok)throw new Error(d.erro||'Erro');
    localStorage.removeItem('carrinho');carrinho.length=0;atualizarQtd();
    var m=document.getElementById('modal');if(m)m.classList.add('escondido');
    var qr=document.getElementById('qrcode-img');if(qr)qr.src=d.qrCodeBase64?(d.qrCodeBase64.indexOf('data:')===0?d.qrCodeBase64:'data:image/png;base64,'+d.qrCodeBase64):'';
    var px=document.getElementById('pix-copia-cola');if(px)px.value=d.pixCopiaECola||'';
    var mp=document.getElementById('modal-pix');if(mp)mp.classList.remove('escondido');
    if(pollingId)clearInterval(pollingId);
    pollingId=setInterval(async function(){
      var rr=await fetch('/api/pedidos/'+d.pedidoId);var dd=await rr.json();
      if(dd.status==='pago'){clearInterval(pollingId);var sp=document.getElementById('status-pix');if(sp)sp.textContent='✅ Pagamento confirmado!';setTimeout(function(){location.href='/obrigado.html?pedido='+d.pedidoId;},1200);}
    },4000);
  }catch(err){alert(err.message);btn.disabled=false;btn.textContent='Gerar Pix';}
};

var bCp=document.getElementById('btn-copiar');
if(bCp)bCp.onclick=async function(){var t=document.getElementById('pix-copia-cola').value;try{await navigator.clipboard.writeText(t);bCp.textContent='✅ Copiado!';setTimeout(function(){bCp.textContent='Copiar código';},1500);}catch(e){document.getElementById('pix-copia-cola').select();document.execCommand('copy');}};

carregarCategorias();
carregarProdutos();
atualizarQtd();

// Busca CEP automaticamente
document.addEventListener('input', async function(e) {
  if (e.target.name !== 'cep') return;
  var cep = e.target.value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    var r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
    var d = await r.json();
    if (d.erro) return;
    var form = e.target.closest('form');
    if (form.rua) form.rua.value = d.logradouro || '';
    if (form.bairro) form.bairro.value = d.bairro || '';
    if (form.cidade) form.cidade.value = d.localidade || '';
    if (form.estado) form.estado.value = d.uf || '';
    if (form.numero) form.numero.focus();
    console.log('CEP preenchido');
  } catch(err) { console.error('Erro CEP:', err.message); }
});

// Máscara de CPF
function mascaraCPF(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
}

document.addEventListener('input', function(e) {
  if (e.target.name === 'cpf') {
    var pos = e.target.selectionStart;
    var antes = e.target.value.length;
    e.target.value = mascaraCPF(e.target.value);
    var depois = e.target.value.length;
    e.target.setSelectionRange(pos + (depois - antes), pos + (depois - antes));
  }
});

