import { useState } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { EVENT } from '../lib/site-content';

interface Slot {
  time: string;
  title: string;
  zone: string;
}

const DIA_1: Slot[] = [
  { time: '10h00', title: 'Abertura de portas', zone: 'Entrada' },
  { time: '10h30', title: 'Concurso de Cosplay — inscrições', zone: 'Palco Principal' },
  { time: '12h00', title: 'Torneio de Gaming — fase de grupos', zone: 'Zona Gamer' },
  { time: '15h00', title: 'Artist Alley aberto', zone: 'Artist Alley' },
  { time: '17h00', title: 'Desfile de Cosplay', zone: 'Palco Principal' },
  { time: '19h00', title: 'Encerramento do dia', zone: 'Entrada' },
];

const DIA_2: Slot[] = [
  { time: '10h00', title: 'Abertura de portas', zone: 'Entrada' },
  { time: '11h00', title: 'Torneio de Gaming — finais', zone: 'Zona Gamer' },
  { time: '13h00', title: 'Painel de banda desenhada angolana', zone: 'Sala de Talks' },
  { time: '15h30', title: 'Sessão de cinema/projeção', zone: 'Sala de Cinema' },
  { time: '17h30', title: 'Entrega de prémios', zone: 'Palco Principal' },
  { time: '19h00', title: 'Encerramento do Nexus', zone: 'Entrada' },
];

export function Programacao() {
  const [day, setDay] = useState<1 | 2>(1);
  const slots = day === 1 ? DIA_1 : DIA_2;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Programação" title="O que esperar no Nexus" />

      <div className="rot-1 mt-8 border-2 border-yellow bg-yellow/10 px-5 py-4 text-sm text-cream/90">
        A grelha abaixo é um exemplo de estrutura, para dar uma ideia do formato do evento. Os horários e as
        atividades finais são publicados pela organização mais perto da data — consulta as redes sociais do
        Kwamikon para a programação confirmada.
      </div>

      <div className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={() => setDay(1)}
          className={`cut-tag px-6 py-2 text-sm font-extrabold uppercase tracking-wide transition-transform ${
            day === 1 ? 'rotate-1 bg-magenta text-cream' : 'text-cream/60 hover:text-cream'
          }`}
        >
          Dia 1 — 31 out
        </button>
        <button
          type="button"
          onClick={() => setDay(2)}
          className={`cut-tag px-6 py-2 text-sm font-extrabold uppercase tracking-wide transition-transform ${
            day === 2 ? '-rotate-1 bg-magenta text-cream' : 'text-cream/60 hover:text-cream'
          }`}
        >
          Dia 2 — 1 nov
        </button>
      </div>

      <ol className="mt-8 space-y-3">
        {slots.map((slot) => (
          <li
            key={`${day}-${slot.time}`}
            className="flex flex-col gap-1 border-l-4 border-magenta/60 bg-ink-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-extrabold text-yellow">{slot.time}</span>
              <span className="font-semibold text-cream">{slot.title}</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-cream/50">{slot.zone}</span>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-cream/50">
        Dúvidas sobre a programação? Contacta a {EVENT.orgName} pelo {EVENT.orgPhone}.
      </p>
    </div>
  );
}
