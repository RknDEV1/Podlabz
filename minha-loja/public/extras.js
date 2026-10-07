(function(){
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(s){return document.querySelector(s)};
  var barra=document.createElement('div'); barra.id='scroll-bar'; document.body.appendChild(barra);
  var topo=document.createElement('button'); topo.id='topo'; topo.textContent='↑'; topo.setAttribute('aria-label','Voltar ao topo');
  topo.onclick=function(){scrollTo({top:0,behavior:'smooth'})}; document.body.appendChild(topo);
  var hdr=$('header');
  addEventListener('scroll',function(){
    var h=document.documentElement, p=h.scrollTop/(h.scrollHeight-h.clientHeight||1);
    barra.style.width=(p*100)+'%';
    if(hdr) hdr.classList.toggle('encolhido',h.scrollTop>40);
    topo.classList.toggle('vis',h.scrollTop>500);
  },{passive:true});
  var box=document.createElement('div'); box.id='toast-box'; document.body.appendChild(box);
  function toast(msg){
    var t=document.createElement('div'); t.className='toast'; t.textContent=msg; box.appendChild(t);
    setTimeout(function(){t.classList.add('sai'); setTimeout(function(){t.remove()},300)},2200);
  }
  var qtd=$('#qtd-carrinho'), btnC=$('#btn-carrinho'), ultimo=parseInt(qtd&&qtd.textContent)||0;
  if(qtd) new MutationObserver(function(){
    var n=parseInt(qtd.textContent)||0;
    if(n>ultimo){ toast('🛒 Adicionado ao carrinho'); if(btnC){btnC.classList.remove('bump'); void btnC.offsetWidth; btnC.classList.add('bump');} }
    ultimo=n;
  }).observe(qtd,{childList:true,characterData:true,subtree:true});
  var prod=$('#produtos');
  if(prod && !reduz && matchMedia('(hover:hover)').matches){
    prod.addEventListener('mousemove',function(e){
      var c=e.target.closest('.card'); if(!c) return;
      var r=c.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
      c.classList.add('tilt');
      c.style.setProperty('--mx',x+'px'); c.style.setProperty('--my',y+'px');
      c.style.transform='perspective(800px) rotateX('+((.5-y/r.height)*8)+'deg) rotateY('+((x/r.width-.5)*8)+'deg) translateY(-4px)';
    });
    prod.addEventListener('mouseout',function(e){
      var c=e.target.closest('.card'); if(c && !c.contains(e.relatedTarget)){c.style.transform=''; c.classList.remove('tilt');}
    });
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b||reduz) return;
    var r=b.getBoundingClientRect(), s=Math.max(r.width,r.height)/2, o=document.createElement('span');
    o.className='ripple'; o.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px';
    b.appendChild(o); setTimeout(function(){o.remove()},600);
  });
})();
