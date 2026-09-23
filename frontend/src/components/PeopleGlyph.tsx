/** Ícone facetado próprio (não genérico), para representar nº de pessoas de um pacote. */
export function PeopleGlyph({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
        <svg key={i} width="11" height="13" viewBox="0 0 11 13" className="shrink-0">
          <polygon points="5.5,0 11,3.5 9,13 2,13 0,3.5" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
