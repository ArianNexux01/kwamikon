interface MaskGlyphProps {
  className?: string;
}

/** Marca de água decorativa com o ícone da máscara, nunca distorcida nem recolorida. */
export function MaskGlyph({ className = '' }: MaskGlyphProps) {
  return (
    <img
      src="/brand/mask-icon.png"
      alt=""
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
