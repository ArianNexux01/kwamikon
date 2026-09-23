import { useCallback, useEffect, useRef, useState } from 'react';

export type Aspect = 'square' | 'story';

export const EXPORT_SIZES: Record<Aspect, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
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
export function useEuVouCanvas(frameSrc: string) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);

  const [aspect, setAspect] = useState<Aspect>('square');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      frameImgRef.current = img;
      setReady(true);
    };
    img.src = frameSrc;
  }, [frameSrc]);

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
      const frame = frameImgRef.current;
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

      // Moldura: escala uniforme (nunca distorcida), ancorada consoante o formato.
      const frameScale = size.w / frame.naturalWidth;
      const frameW = size.w;
      const frameH = frame.naturalHeight * frameScale;
      const frameY = targetAspect === 'story' ? size.h - frameH : (size.h - frameH) / 2;
      ctx.drawImage(frame, 0, frameY, frameW, frameH);
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
