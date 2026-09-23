interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  align?: 'left' | 'center';
  tone?: 'yellow' | 'magenta';
}

export function SectionHeading({ eyebrow, title, align = 'left', tone = 'yellow' }: SectionHeadingProps) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      <span
        className={`inline-block -rotate-1 cut-tag px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] ${
          tone === 'yellow' ? 'bg-yellow text-ink' : 'bg-magenta text-cream'
        }`}
      >
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] text-cream sm:text-4xl md:text-5xl">{title}</h2>
    </div>
  );
}
