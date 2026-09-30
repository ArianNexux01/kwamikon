export type CheckoutStep = 1 | 2 | 3 | 4;

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: 1, label: 'Pacote' },
  { id: 2, label: 'Os teus dados' },
  { id: 3, label: 'Pagamento' },
  { id: 4, label: 'Confirmação' },
];

export function CheckoutStepper({ current }: { current: CheckoutStep }) {
  return (
    <ol className="mt-10 grid grid-cols-4 gap-2" aria-label="Passos da compra">
      {STEPS.map((s) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <li key={s.id} aria-current={active ? 'step' : undefined}>
            <div className={`h-1.5 ${done || active ? 'bg-yellow' : 'bg-cream/15'}`} />
            <p
              className={`mt-2 text-[0.65rem] font-extrabold uppercase tracking-widest sm:text-xs ${
                active ? 'text-yellow' : done ? 'text-cream/70' : 'text-cream/30'
              }`}
            >
              <span className="mr-1">{s.id}.</span>
              <span className={active ? '' : 'hidden sm:inline'}>{s.label}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
