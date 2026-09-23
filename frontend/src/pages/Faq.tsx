import { useState } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { FAQ_ITEMS } from '../lib/site-content';

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes" />

      <div className="mt-10 space-y-3">
        {FAQ_ITEMS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.question} className="border-2 border-cream/15 bg-ink-soft">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-bold text-cream">{item.question}</span>
                <span className={`shrink-0 text-2xl text-yellow transition-transform ${open ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {open && <p className="px-5 pb-5 text-sm leading-relaxed text-cream/70">{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
