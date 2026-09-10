// Espaço reservado dos gráficos da tela de Ganhos, enquanto o recharts carrega.
//
// ⚠️ ARQUIVO SEPARADO DE PROPÓSITO — não junte com GraficosGanhos.jsx.
//
// Este componente é o `fallback` do <Suspense>, então ele precisa estar
// disponível NA HORA, junto da página. Se morasse no mesmo arquivo do gráfico,
// importá-lo arrastaria o recharts (108 KB comprimidos) de volta pro pedaço
// principal — e o carregamento sob demanda deixaria de existir, em silêncio,
// sem nada quebrar visivelmente. O ganho sumiria e ninguém notaria.
//
// A ALTURA é exportada e usada pelos DOIS lados. É o que garante que o gráfico
// entre exatamente no espaço reservado, sem a página dar um salto — e é por
// isso que o número mora aqui, num arquivo só, em vez de repetido nos dois.
import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';

export const ALTURA_GRAFICO = 300;

export default function EsqueletoGraficos() {
  return (
    <>
      {['Ganhos Diários', 'Entregas Diárias'].map((titulo) => (
        <Card key={titulo} className="shadow-lg p-4">
          <CardTitle className="text-lg font-semibold mb-4 text-gray-700">{titulo}</CardTitle>
          <div
            style={{ height: ALTURA_GRAFICO }}
            className="flex items-center justify-center rounded-lg bg-gray-50 animate-pulse"
            role="status"
            aria-label={`Carregando o gráfico de ${titulo}`}
          >
            <span className="text-sm text-gray-400">Montando o gráfico…</span>
          </div>
        </Card>
      ))}
    </>
  );
}
