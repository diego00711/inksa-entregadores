// src/utils/dinheiro.js
//
// O ÚNICO formatador de dinheiro do app.
//
// POR QUE ISTO EXISTE: conviviam quatro jeitos de escrever o mesmo valor, e
// 67 lugares nos quatro apps imprimiam "R$ 38.90" — com ponto, do jeito que o
// JavaScript escreve número e do jeito que ninguém no Brasil escreve dinheiro.
// Dava pra ver os dois formatos na MESMA tela: o item a "R$ 38.90" e o frete a
// "R$ 35,00", um debaixo do outro.
//
// REGRA: dinheiro na tela sai daqui. Não escreva `R$ ${x.toFixed(2)}`.
//
// ⚠️ A saída usa ESPAÇO DURO (U+00A0) entre o "R$" e o número — é o que o Intl
// devolve e é o certo na tela: impede que a quebra de linha largue o "R$"
// sozinho no fim de uma linha com o valor na seguinte. Onde esse espaço
// atrapalha (impressora térmica, campo de formulário, comparação de string),
// use `numeroBR` e monte o "R$ " à mão.

/**
 * Vira número seja lá o que vier: number, string do Postgres ("38.90"),
 * null, undefined, "" ou lixo. Nunca devolve NaN — o `Intl` formata NaN como
 * "R$ NaN", que já apareceu em tela.
 */
export function paraNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

const NBSP = ' ';

// Construir um Intl.NumberFormat é caro e ele é imutável — vale guardar.
// Uma tabela de pedidos chama isto uma vez por célula.
const cache = new Map();

function formatador(chave, opcoes) {
  if (cache.has(chave)) return cache.get(chave);
  let f = null;
  try {
    f = new Intl.NumberFormat('pt-BR', opcoes);
  } catch {
    // WebView antiga sem Intl completo. Não deixa a tela quebrar por causa
    // de formatação: cai no remendo abaixo, que erra o espaçamento mas
    // acerta a vírgula, que é o que importa.
  }
  cache.set(chave, f);
  return f;
}

function remendo(n, casas, comSimbolo) {
  const negativo = n < 0;
  const [inteiro, decimais] = Math.abs(n).toFixed(casas).split('.');
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const corpo = `${milhar}${decimais ? `,${decimais}` : ''}`;
  return `${negativo ? '-' : ''}${comSimbolo ? `R$${NBSP}` : ''}${corpo}`;
}

/** "R$ 38,90" — o formato de dinheiro do app. */
export function brl(v) {
  const n = paraNumero(v);
  const f = formatador('brl2', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return f ? f.format(n) : remendo(n, 2, true);
}

/**
 * "R$ 39" — sem centavos. Para meta e faixa, onde o centavo é ruído:
 * "venda R$ 500" lê melhor que "venda R$ 500,00".
 */
export function brlSemCentavos(v) {
  const n = paraNumero(v);
  const f = formatador('brl0', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  return f ? f.format(n) : remendo(n, 0, true);
}

/**
 * "38,90" — só o número, sem símbolo e sem espaço duro.
 * Para onde o "R$" é um elemento à parte na tela, ou para texto que vai
 * pra impressora.
 */
export function numeroBR(v, casas = 2) {
  const n = paraNumero(v);
  const f = formatador(`n${casas}`, {
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  });
  return f ? f.format(n) : remendo(n, casas, false);
}
