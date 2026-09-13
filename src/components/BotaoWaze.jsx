// src/components/BotaoWaze.jsx
import React from 'react';
import { Navigation } from 'lucide-react';
import { abrirWaze, abrirMaps, destinoDaCorrida, destinoTemCoordenada } from '../utils/navegacao';

/**
 * O botão de navegar da corrida. Grande, e sabendo pra onde ir sozinho.
 *
 * POR QUE ELE DECIDE O DESTINO
 *
 * O entregador está de capacete, no trânsito, com o celular no suporte. Pedir
 * pra ele escolher entre "loja" e "cliente" nesse momento é pedir pra ele errar
 * — ou parar a moto. O pedido já sabe em que perna está (ver destinoDaCorrida):
 * antes de retirar o destino é a loja, depois é o cliente. Um botão só.
 *
 * ⚠️ stopPropagation OBRIGATÓRIO: este botão mora dentro de cards que abrem o
 * modal no clique. Sem isso, tocar em "Ir até a loja" abre o modal por baixo do
 * Waze — e quando ele volta pro app, está numa tela que não pediu.
 */
export function BotaoWaze({ pedido, className = '', compacto = false }) {
  const destino = destinoDaCorrida(pedido);
  const semCoord = !destinoTemCoordenada(pedido);

  const ir = (fn) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    fn(destino.lat, destino.lng, destino.endereco);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex gap-2">
        <button
          onClick={ir(abrirWaze)}
          className="flex-1 flex items-center justify-center gap-2 bg-[#00D8FF] hover:bg-[#00C4E6] active:bg-[#00B0CC] text-white font-bold rounded-lg min-h-[48px] px-4 shadow-sm"
        >
          <Navigation className="h-5 w-5" />
          {compacto ? 'Waze' : destino.rotulo}
        </button>
        <button
          onClick={ir(abrirMaps)}
          title="Abrir no Google Maps"
          className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg min-h-[48px] px-4 shadow-sm"
        >
          Maps
        </button>
      </div>
      {semCoord && (
        // Vale dizer: sem coordenada o Waze recebe o endereço ESCRITO e
        // geocodifica por conta dele. Funciona na maioria das vezes e erra
        // feio em algumas — o entregador merece saber em qual caso está.
        <p className="text-[11px] text-amber-700 leading-tight">
          Sem localização exata — o Waze vai buscar pelo endereço. Confira ao chegar.
        </p>
      )}
    </div>
  );
}

export default BotaoWaze;
