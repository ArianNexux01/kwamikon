import { PeopleGlyph } from './PeopleGlyph';
import { packageStyle } from '../lib/packages';
import { formatKz } from '../lib/format';
import type { TicketType } from '../lib/api';

interface TicketCardBodyProps {
  type: TicketType;
  selected?: boolean;
}

export function TicketCardBody({ type, selected }: TicketCardBodyProps) {
  const style = packageStyle(type.name);

  return (
    <>
      <div className={`cut-tag flex items-center justify-between px-4 py-2 ${style.bg} ${style.text}`}>
        <span className="text-sm font-extrabold uppercase tracking-wide">{type.name}</span>
        {selected && <span className="text-xs font-extrabold">✓</span>}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-widest text-cream/40">{style.tagline}</p>
        <div className={`mt-2 ${style.accent}`}>
          <PeopleGlyph count={type.peopleCount} />
        </div>
        <p className="mt-1 text-xs font-semibold text-cream/60">
          {type.peopleCount} {type.peopleCount === 1 ? 'pessoa' : 'pessoas'}
        </p>
        <p className="mt-3 text-xs text-cream/50">{type.description}</p>

        <div className="mt-auto pt-4">
          <p className="text-2xl font-extrabold text-cream">{formatKz(type.refPrice)}</p>
          {type.peopleCount > 1 && (
            <p className="text-[0.65rem] text-cream/40">
              {formatKz(Math.round(type.refPrice / type.peopleCount))} por pessoa
            </p>
          )}
        </div>
      </div>
    </>
  );
}
