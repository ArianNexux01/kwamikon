import { useEffect, useState } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { api, type ProgramItem } from '../lib/api';
import { formatEventDay } from '../lib/format';
import { EVENT } from '../lib/site-content';

export function Programacao() {
  const [eventDays, setEventDays] = useState<string[]>([]);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.program
      .list()
      .then((data) => {
        setEventDays(data.eventDays);
        setItems(data.items);
        // Abre no primeiro dia que já tenha atividades.
        setDay(data.eventDays.find((d) => data.items.some((i) => i.eventDay === d)) ?? data.eventDays[0] ?? null);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const slots = items.filter((item) => item.eventDay === day);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Programação" title="O que esperar no Nexus" />

      {loading && <p className="mt-10 text-sm text-cream/50">A carregar a programação…</p>}

      {!loading && (failed || items.length === 0) && (
        <div className="rot-1 mt-10 border-2 border-yellow bg-yellow/10 px-6 py-8 text-center">
          <p className="text-2xl font-extrabold text-yellow sm:text-3xl">Programação brevemente disponível</p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-cream/75">
            Estamos a fechar os horários do {EVENT.name}, {EVENT.dateLabel}. Volta em breve para veres tudo o que vai
            acontecer no {EVENT.venue}.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="mt-10 flex flex-wrap gap-3" role="tablist" aria-label="Dias do evento">
            {eventDays.map((d, i) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === day}
                onClick={() => setDay(d)}
                className={`cut-tag px-6 py-2 text-sm font-extrabold uppercase tracking-wide transition-transform ${
                  d === day
                    ? `${i % 2 === 0 ? 'rotate-1' : '-rotate-1'} bg-magenta text-cream`
                    : 'text-cream/60 hover:text-cream'
                }`}
              >
                Dia {i + 1}, {formatEventDay(d)}
              </button>
            ))}
          </div>

          {slots.length === 0 ? (
            <p className="mt-8 border-l-4 border-yellow/60 bg-ink-soft px-5 py-4 text-sm text-cream/70">
              A programação deste dia está brevemente disponível.
            </p>
          ) : (
            <ol className="mt-8 space-y-3">
              {slots.map((slot) => (
                <li
                  key={slot.id}
                  className="flex flex-col gap-1 border-l-4 border-magenta/60 bg-ink-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 shrink-0 font-extrabold text-yellow">
                      {slot.startTime}
                      {slot.endTime && <span className="text-yellow/60">–{slot.endTime}</span>}
                    </span>
                    <span>
                      <span className="block font-semibold text-cream">{slot.title}</span>
                      {slot.description && <span className="mt-1 block text-sm text-cream/60">{slot.description}</span>}
                    </span>
                  </div>
                  {slot.zone && (
                    <span className="pl-28 text-xs font-bold uppercase tracking-widest text-cream/50 sm:shrink-0 sm:pl-0">
                      {slot.zone}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <p className="mt-10 text-sm text-cream/50">
        Dúvidas sobre a programação? Contacta a {EVENT.orgName} pelo {EVENT.orgPhone}.
      </p>
    </div>
  );
}
