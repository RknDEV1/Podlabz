(function(){
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero');
  if(hero){
    var itens=['PODS','ESSÊNCIAS','RESISTÊNCIAS','PODLABZ'], html='';
    for(var i=0;i<16;i++) html+='<span>'+itens[i%4]+' ✦</span>';
    var m=document.createElement('div'); m.className='marquee'; m.setAttribute('aria-hidden','true');
    m.innerHTML='<div class="trilha">'+html+html+'</div>';
    hero.after(m);
  }
  if(reduz) return;
  if(matchMedia('(hover:hover)').matches){
    var g=document.createElement('div'); g.id='brilho'; document.body.appendChild(g);
    var x=innerWidth/2,y=innerHeight/2,tx=x,ty=y;
    addEventListener('mousemove',function(e){tx=e.clientX;ty=e.clientY});
    (function loop(){ x+=(tx-x)*.08; y+=(ty-y)*.08; g.style.transform='translate('+x+'px,'+y+'px)'; requestAnimationFrame(loop); })();
  }
  var ultima=null;
  document.addEventListener('click',function(e){
    var b=e.target.closest('.btn-add'); if(!b) return;
    var c=b.closest('.card'), im=c&&c.querySelector('img.imagem'); if(im) ultima=im;
  },true);
  var qtd=document.getElementById('qtd-carrinho'), n0=parseInt(qtd&&qtd.textContent)||0;
  if(qtd) new MutationObserver(function(){
    var n=parseInt(qtd.textContent)||0, cart=document.getElementById('btn-carrinho');
    if(n>n0 && ultima && cart){
      var a=ultima.getBoundingClientRect(), b=cart.getBoundingClientRect(), f=ultima.cloneNode();
      f.removeAttribute('loading');
      f.style.cssText='position:fixed;z-index:300;pointer-events:none;border-radius:14px;object-fit:cover;left:'+a.left+'px;top:'+a.top+'px;width:'+a.width+'px;height:'+a.height+'px';
      document.body.appendChild(f);
      var dx=b.left+b.width/2-(a.left+a.width/2), dy=b.top+b.height/2-(a.top+a.height/2);
      f.animate([
        {transform:'translate(0,0) scale(1)',opacity:1},
        {transform:'translate('+dx*.5+'px,'+(dy*.5-60)+'px) scale(.5)',opacity:.9,offset:.5},
        {transform:'translate('+dx+'px,'+dy+'px) scale(.08)',opacity:.2}
      ],{duration:750,easing:'cubic-bezier(.4,0,.2,1)'}).onfinish=function(){f.remove()};
    }
    n0=n;
  }).observe(qtd,{childList:true,characterData:true,subtree:true});
})();
