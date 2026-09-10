// Os dois gráficos da tela de Ganhos, num arquivo só.
//
// ⚠️ POR QUE ELES SAÍRAM DA PÁGINA (10/09/2026)
//
// O recharts sozinho responde por quase todo o peso da EarningsPage: 388 KB
// (108 KB comprimidos), o maior pedaço do app inteiro. Enquanto ele morava
// dentro da página, o entregador não via NADA — nem o quanto ganhou, nem as
// entregas do dia — antes de baixar a biblioteca de gráfico inteira. Numa
// conexão de rua isso é uma tela vazia por vários segundos, pra ver um número
// que já tinha chegado da API.
//
// Agora a página carrega e mostra os números na hora; o gráfico entra depois,
// no lugar reservado pra ele. Quem só quer conferir quanto fez no dia não
// espera por biblioteca nenhuma.
//
// O espaço reservado vive em EsqueletoGraficos.jsx, num arquivo SEPARADO —
// ver o aviso lá. Daqui só vem a altura, pra que os dois combinem sempre.
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardTitle } from '@/components/ui/card';
import { ALTURA_GRAFICO as ALTURA } from './EsqueletoGraficos';

// ⚠️ NÃO USE `new Date('2026-09-05')` AQUI. Data pura em ISO é interpretada
// como MEIA-NOITE EM UTC; no nosso fuso (UTC-3) isso volta pro dia anterior, e
// o eixo saía um dia atrasado — o ganho de segunda aparecia como domingo. O bug
// já existia antes de os gráficos virem pra este arquivo; apareceu ao medir com
// datas conhecidas (mandei 05, 06 e 07/09 e o eixo rotulou 04, 05 e 06).
//
// Aqui a string já vem no formato do banco (YYYY-MM-DD), então recortar é mais
// honesto que converter: não existe fuso envolvido num rótulo de dia.
const dia = (tick) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(tick ?? ''));
  if (m) return `${m[3]}/${m[2]}`;
  // Formato inesperado (timestamp completo, Date): aí sim converte.
  try { return format(new Date(tick), 'dd/MM'); } catch { return tick; }
};

export default function GraficosGanhos({ dados }) {
  const lista = Array.isArray(dados) ? dados : [];
  return (
    <>
      <Card className="shadow-lg p-4">
        <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Ganhos Diários</CardTitle>
        <ResponsiveContainer width="100%" height={ALTURA}>
          <LineChart data={lista}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="earning_date" tickFormatter={dia} />
            <YAxis tickFormatter={(tick) => `R$${Number(tick).toFixed(2)}`} />
            <Tooltip formatter={(value) => [`R$${Number(value).toFixed(2)}`, 'Ganhos']} />
            <Legend />
            <Line type="monotone" dataKey="total_earned_daily" stroke="#16a34a"
                  strokeWidth={2.5} activeDot={{ r: 8 }} name="Ganhos" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="shadow-lg p-4">
        <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Entregas Diárias</CardTitle>
        <ResponsiveContainer width="100%" height={ALTURA}>
          <BarChart data={lista}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="earning_date" tickFormatter={dia} />
            <YAxis />
            <Tooltip formatter={(value) => [value, 'Entregas']} />
            <Legend />
            <Bar dataKey="total_deliveries_daily" fill="#2563eb"
                 radius={[4, 4, 0, 0]} name="Entregas" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
