const TABELA = {
  sergipe:     { nome: 'Sergipe',      preco: 2000, prazo: '7 a 10 dias úteis',  ceps: [[49,49]] },
  sudeste:     { nome: 'Sudeste',      preco: 2000, prazo: '7 a 10 dias úteis',  ceps: [[1,19],[20,28],[29,29],[30,39]] },
  sul:         { nome: 'Sul',          preco: 2500, prazo: '7 a 10 dias úteis',  ceps: [[80,99]] },
  centrooeste: { nome: 'Centro-Oeste', preco: 3000, prazo: '7 a 10 dias úteis', ceps: [[70,79]] },
  nordeste:    { nome: 'Nordeste',     preco: 3000, prazo: '7 a 10 dias úteis', ceps: [[40,48],[50,65]] },
  norte:       { nome: 'Norte',        preco: 4500, prazo: '7 a 10 dias úteis', ceps: [[66,69]] }
};

const FRETE_GRATIS_ACIMA = 25000;

async function calcularFrete({ cepDestino, itens }) {
  const cep = String(cepDestino).replace(/\D/g, '');
  if (cep.length !== 8) return [];
  const prefixo = parseInt(cep.substring(0, 2), 10);

  let regiao = null;
  for (const dados of Object.values(TABELA)) {
    for (const [de, ate] of dados.ceps) {
      if (prefixo >= de && prefixo <= ate) { regiao = dados; break; }
    }
    if (regiao) break;
  }

  if (!regiao) return [];

  const total = itens.reduce((s, i) => s + (i.preco_centavos * i.quantidade), 0);
  const gratis = total >= FRETE_GRATIS_ACIMA;

  return [{
    id: 1,
    nome: gratis ? 'Frete Grátis' : 'Entrega Padrão',
    transportadora: 'Podlabz',
    preco: gratis ? 0 : regiao.preco / 100,
    prazo: gratis ? '5 a 12 dias úteis' : regiao.prazo,
    obs: 'Prazo estimado após confirmação do pagamento'
  }];
}

module.exports = { calcularFrete };
