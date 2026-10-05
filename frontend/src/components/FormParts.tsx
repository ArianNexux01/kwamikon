/** Peças dos formulários públicos de compra (bilhetes e torneios). */

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      {...props}
      className="focus-ring cut-tag rotate-1 bg-magenta px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-cream transition-transform hover:-rotate-1 hover:scale-105 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring text-sm font-bold text-cream/60 underline underline-offset-4 hover:text-cream"
    >
      Voltar
    </button>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 border-l-4 border-magenta bg-magenta/10 px-4 py-3 text-sm text-cream">
      {message}
    </p>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold text-cream/80">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
