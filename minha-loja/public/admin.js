function $(id){ return document.getElementById(id); }

function mostrarLogin(){
  $('tela-login').classList.remove('escondido');
  $('painel').classList.add('escondido');
}
function mostrarPainel(){
  $('tela-login').classList.add('escondido');
  $('painel').classList.remove('escondido');
}

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: senha })
    });
    var d = await r.json();
    if (!r.ok) { msg.textContent = d.erro || 'Erro'; }
    else { mostrarPainel(); }
  } catch(e) {
    msg.textContent = 'Erro de conexão';
  }
  $('btn-login').disabled = false;
  $('btn-login').textContent = 'Entrar';
}

async function fazerLogout(){
  try { await fetch('/api/admin/logout', { method: 'POST' }); } catch(e) {}
  mostrarLogin();
}

async function verificarLogin(){
  try {
    var r = await fetch('/api/admin/me');
    if (r.ok) mostrarPainel();
    else mostrarLogin();
  } catch(e) { mostrarLogin(); }
}

$('btn-login').onclick = fazerLogin;
$('senha').addEventListener('keypress', function(e){ if (e.key === 'Enter') fazerLogin(); });
$('btn-sair').onclick = fazerLogout;

verificarLogin();
