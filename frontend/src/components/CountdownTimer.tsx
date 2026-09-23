import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  target: Date;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function getRemaining(target: Date): Remaining {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    done: false,
  };
}

const UNITS: Array<{ key: keyof Omit<Remaining, 'done'>; label: string }> = [
  { key: 'days', label: 'Dias' },
  { key: 'hours', label: 'Horas' },
  { key: 'minutes', label: 'Minutos' },
  { key: 'seconds', label: 'Segundos' },
];

export function CountdownTimer({ target }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(target));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining.done) {
    return (
      <p className="cut-tag inline-block -rotate-1 bg-yellow px-5 py-2 text-sm font-extrabold uppercase tracking-wide text-ink">
        O Nexus está a acontecer agora!
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3" role="timer" aria-label="Contagem decrescente para o Kwamikon Nexus">
      {UNITS.map((unit, i) => (
        <div
          key={unit.key}
          className={`${i % 2 === 0 ? 'rot-1' : '-rotate-1'} flex w-[4.2rem] flex-col items-center border-2 border-cream/20 bg-ink-soft py-3 sm:w-20`}
        >
          <span className="font-mono text-2xl font-extrabold tabular-nums text-yellow sm:text-3xl">
            {String(remaining[unit.key]).padStart(2, '0')}
          </span>
          <span className="mt-1 text-[0.6rem] font-bold uppercase tracking-widest text-cream/50">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
