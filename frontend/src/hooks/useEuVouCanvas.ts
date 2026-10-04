import { useCallback, useEffect, useRef, useState } from 'react';

export type Aspect = 'square' | 'portrait' | 'story';

export const EXPORT_SIZES: Record<Aspect, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

interface Offset {
  x: number;
  y: number;
}

/**
 * Composição da foto do visitante com a moldura oficial, feita inteiramente
 * em canvas no browser — a foto nunca é enviada para nenhum servidor.
 */
export function useEuVouCanvas(frameSrcs: Record<Aspect, string>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameImgsRef = useRef<Partial<Record<Aspect, HTMLImageElement>>>({});
  const photoImgRef = useRef<HTMLImageElement | null>(null);

  const [aspect, setAspect] = useState<Aspect>('square');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [ready, setReady] = useState(false);

  // Formatos podem partilhar a mesma moldura: cada ficheiro é carregado uma vez.
  const squareSrc = frameSrcs.square;
  const portraitSrc = frameSrcs.portrait;
  const storySrc = frameSrcs.story;
  useEffect(() => {
    const srcs: Record<Aspect, string> = { square: squareSrc, portrait: portraitSrc, story: storySrc };
    const unique = [...new Set(Object.values(srcs))];
    let cancelled = false;
    Promise.all(
      unique.map(
        (src) =>
          new Promise<[string, HTMLImageElement]>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve([src, img]);
            img.onerror = reject;
            img.src = src;
          }),
      ),
    )
      .then((loaded) => {
        if (cancelled) return;
        const bySrc = new Map(loaded);
        frameImgsRef.current = {
          square: bySrc.get(srcs.square),
          portrait: bySrc.get(srcs.portrait),
          story: bySrc.get(srcs.story),
        };
        setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [squareSrc, portraitSrc, storySrc]);

  const clampOffset = useCallback(
    (raw: Offset, z: number, size: { w: number; h: number }) => {
      const photo = photoImgRef.current;
      if (!photo) return raw;

      const scale0 = Math.max(size.w / photo.naturalWidth, size.h / photo.naturalHeight);
      const scale = scale0 * z;
      const drawW = photo.naturalWidth * scale;
      const drawH = photo.naturalHeight * scale;

      const maxX = Math.max(0, (drawW - size.w) / 2);
      const maxY = Math.max(0, (drawH - size.h) / 2);

      return {
        x: Math.min(maxX, Math.max(-maxX, raw.x)),
        y: Math.min(maxY, Math.max(-maxY, raw.y)),
      };
    },
    [],
  );

  const draw = useCallback(
    (targetAspect: Aspect = aspect) => {
      const canvas = canvasRef.current;
      const frame = frameImgsRef.current[targetAspect];
      if (!canvas || !frame) return;

      const size = EXPORT_SIZES[targetAspect];
      canvas.width = size.w;
      canvas.height = size.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#161616';
      ctx.fillRect(0, 0, size.w, size.h);

      const photo = photoImgRef.current;
      if (photo) {
        const scale0 = Math.max(size.w / photo.naturalWidth, size.h / photo.naturalHeight);
        const scale = scale0 * zoom;
        const drawW = photo.naturalWidth * scale;
        const drawH = photo.naturalHeight * scale;
        const clamped = clampOffset(offset, zoom, size);
        const x = (size.w - drawW) / 2 + clamped.x;
        const y = (size.h - drawH) / 2 + clamped.y;
        ctx.drawImage(photo, x, y, drawW, drawH);
      }

      // Moldura: escala uniforme (nunca distorcida) a cobrir o formato, centrada. Quando a
      // proporção difere (moldura 4:5 em Stories 9:16) corta as laterais, onde só há máscaras.
      const frameScale = Math.max(size.w / frame.naturalWidth, size.h / frame.naturalHeight);
      const frameW = frame.naturalWidth * frameScale;
      const frameH = frame.naturalHeight * frameScale;
      ctx.drawImage(frame, (size.w - frameW) / 2, (size.h - frameH) / 2, frameW, frameH);
    },
    [aspect, zoom, offset, clampOffset],
  );

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  function loadPhoto(file: File | Blob) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photoImgRef.current = img;
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setHasPhoto(true);
      URL.revokeObjectURL(url);
      draw();
    };
    img.src = url;
  }

  function updateOffset(delta: Offset) {
    const size = EXPORT_SIZES[aspect];
    setOffset((prev) => clampOffset({ x: prev.x + delta.x, y: prev.y + delta.y }, zoom, size));
  }

  function changeZoom(value: number) {
    const size = EXPORT_SIZES[aspect];
    setZoom(value);
    setOffset((prev) => clampOffset(prev, value, size));
  }

  function changeAspect(value: Aspect) {
    setAspect(value);
    setOffset((prev) => clampOffset(prev, zoom, EXPORT_SIZES[value]));
  }

  function exportImage(format: 'png' | 'jpeg' = 'png') {
    draw(aspect);
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.92);
  }

  return {
    canvasRef,
    aspect,
    zoom,
    hasPhoto,
    ready,
    loadPhoto,
    updateOffset,
    changeZoom,
    changeAspect,
    exportImage,
    redraw: draw,
  };
}
