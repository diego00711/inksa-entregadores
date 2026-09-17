// src/components/Versiculo.jsx
//
// O VERSÍCULO DA CASA — Provérbios 16:3, no pé da tela de entrada dos quatro
// apps (Cliente, Parceiro, Entregador e Admin).
//
// ## POR QUE NA ENTRADA, E NÃO NO RODAPÉ DE TODA TELA
//
// O versículo fala sobre TRABALHO: "consagre ao Senhor tudo o que você faz".
// A tela de login é o único lugar dos quatro apps onde alguém está parado,
// antes de começar — o entregador antes do turno, o parceiro antes de abrir a
// loja, o cliente antes de pedir. É o momento em que a frase quer dizer alguma
// coisa.
//
// Num rodapé fixo ele apareceria mil vezes por dia e viraria mobília: a pessoa
// para de ler depois da terceira. Repetir não é dar importância — é gastar.
// E o app do Entregador acabou de perder 400 linhas de excesso; devolver ruído
// pra ele agora seria desfazer o trabalho.
//
// ## POR QUE SÓ A REFERÊNCIA, COM O TEXTO ESCONDIDO
//
// Quem conhece, lê "Provérbios 16:3" e já sabe. Quem não conhece e tem
// curiosidade, toca e lê. Quem não quer, não é obrigado a nada — o app é uma
// ferramenta de trabalho e tem gente de toda crença usando.
//
// Escondido não é envergonhado: é convite em vez de anúncio. E tem um efeito
// prático de brinde — ocupa uma linha de 11px em vez de três, e a tela de
// login continua sendo uma tela de login.
//
// ## DETALHES QUE PARECEM FRESCURA E NÃO SÃO
//
//  • É um <button>, não uma <div> com onClick. Div clicável não recebe foco
//    pelo teclado, não responde a Enter/Espaço e não avisa leitor de tela que
//    ali tem algo pra abrir. `aria-expanded` + `aria-controls` fecham isso.
//
//  • A abertura anima `grid-template-rows` de 0fr pra 1fr em vez de max-height
//    chutado. Com max-height ou a frase corta (chute baixo demais) ou a
//    animação fica lenta e vazia (chute alto demais). Com 0fr→1fr o navegador
//    usa a altura real do texto, qualquer que seja o tamanho da fonte do
//    aparelho. Em WebView antiga que não anima isso, ele simplesmente aparece
//    — degrada pra instantâneo, nunca pra quebrado.
//
//  • `motion-reduce:transition-none` respeita quem pediu menos animação no
//    sistema. É uma linha e é o certo.
//
// ⚠️ ESTE ARQUIVO É IDÊNTICO NOS QUATRO APPS, de propósito. Não existe pacote
// compartilhado entre eles (mesma situação de autoAtualiza.js e
// mensagemDeErro.js). Se um dia mudar, mude nos quatro — senão a casa passa a
// falar quatro línguas.
import React, { useId, useState } from 'react';

export default function Versiculo({ className = '' }) {
  const [aberto, setAberto] = useState(false);
  const idTexto = useId();

  return (
    // ⚠️ O respiro de cima é PADDING, não margin, e isso não é indiferença de
    // estilo. O container do login do Cliente usa `space-y-4`, que aplica
    // `margin-top` em todo filho a partir do segundo com seletor de
    // especificidade maior que uma classe solta — um `mt-10` aqui seria
    // silenciosamente reduzido pra 1rem só naquele app, e o versículo ficaria
    // colado no formulário sem ninguém entender por quê. `space-y` não mexe em
    // padding.
    <div className={`flex flex-col items-center pt-10 ${className}`}>
      {/* Fio curto: separa o versículo do formulário sem precisar de caixa,
          borda ou fundo. É o que diz "isto aqui é outra coisa" gastando 1px. */}
      <span aria-hidden="true" className="mb-4 h-px w-10 bg-gray-200" />

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={idTexto}
        /* ⚠️ gray-500, não gray-400. Discreto não pode virar ilegível: sobre
           branco o 400 dá 2,54 de contraste e reprova no mínimo acessível de
           4,5 (medido, não estimado). O 500 dá 4,83 e continua quieto. E aqui
           isso não é regra de papel — metade de quem abre esta tela é
           entregador olhando o celular no sol. */
        className="rounded px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-500
                   transition-colors hover:text-gray-700
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400
                   focus-visible:ring-offset-2"
      >
        Provérbios 16:3
      </button>

      <div
        id={idTexto}
        className={`grid w-full transition-[grid-template-rows,opacity] duration-500 ease-out
                    motion-reduce:transition-none
                    ${aberto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        {/* O overflow-hidden mora AQUI, no filho do grid: é ele que segura o
            texto enquanto a linha do grid ainda tem altura zero. No pai não
            funciona. */}
        <p className="overflow-hidden px-6 pt-3 text-center text-[13px] italic leading-relaxed text-gray-500">
          &ldquo;Consagre ao Senhor tudo o que você faz, e os seus planos serão
          bem-sucedidos.&rdquo;
        </p>
      </div>
    </div>
  );
}
