require('dotenv').config();
require('./lib/telegram').enviar('✅ Podlabz funcionando!').then(r => {
  console.log(r ? '✅ Enviado!' : '❌ Falhou');
});
