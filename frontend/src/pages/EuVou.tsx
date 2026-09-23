import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import moldura from '../assets/brand/moldura-euvou.png';
import { useEuVouCanvas, type Aspect } from '../hooks/useEuVouCanvas';
import { EVENT } from '../lib/site-content';

export function EuVou() {
  const {
    canvasRef,
    aspect,
    zoom,
    hasPhoto,
    loadPhoto,
    updateOffset,
    changeZoom,
    changeAspect,
    exportImage,
  } = useEuVouCanvas(moldura);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const dragState = useRef<{ x: number; y: number } | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'unsupported' | 'error'>('idle');

  const shareText = `Eu vou ao Kwamikon Nexus! ${EVENT.dateLabel} de ${EVENT.year}, no ${EVENT.venue}. ${EVENT.hashtag}`;

  async function openCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setCameraError('Não foi possível aceder à câmara. Podes carregar uma foto em alternativa.');
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const temp = document.createElement('canvas');
    temp.width = video.videoWidth;
    temp.height = video.videoHeight;
    const ctx = temp.getContext('2d');
    if (!ctx) return;
    ctx.translate(temp.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    temp.toBlob((blob) => {
      if (blob) loadPhoto(blob);
    }, 'image/jpeg', 0.92);
    closeCamera();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadPhoto(file);
    e.target.value = '';
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!hasPhoto) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragState.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = canvasRef.current.width / rect.width;
    const dx = (e.clientX - dragState.current.x) * scaleFactor;
    const dy = (e.clientY - dragState.current.y) * scaleFactor;
    dragState.current = { x: e.clientX, y: e.clientY };
    updateOffset({ x: dx, y: dy });
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function download(format: 'png' | 'jpeg') {
    const dataUrl = exportImage(format);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `kwamikon-nexus-euvou.${format === 'png' ? 'png' : 'jpg'}`;
    a.click();
  }

  async function shareImage() {
    const dataUrl = exportImage('png');
    if (!dataUrl) return;

    setShareState('sharing');
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'kwamikon-nexus-euvou.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: EVENT.name, text: shareText });
        setShareState('idle');
      } else {
        setShareState('unsupported');
      }
    } catch (err) {
      setShareState(err instanceof Error && err.name === 'AbortError' ? 'idle' : 'error');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow={EVENT.hashtag} title="Cria a tua moldura do Nexus" />
      <p className="mt-4 max-w-2xl text-cream/70">
        Tira uma foto ou carrega uma já existente, ajusta a posição por baixo da moldura oficial e descarrega para
        partilhar. Tudo processado no teu dispositivo: a foto nunca é enviada para nenhum servidor.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          {!hasPhoto && !cameraOn && (
            <div className="flex flex-col gap-4 border-2 border-dashed border-cream/20 p-8 text-center">
              <p className="text-cream/60">Escolhe como queres começar</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={openCamera}
                  className="focus-ring cut-tag rotate-1 bg-magenta px-6 py-3 text-sm font-extrabold uppercase text-cream transition-transform hover:-rotate-1"
                >
                  Usar câmara
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="focus-ring cut-tag -rotate-1 border-2 border-yellow px-6 py-3 text-sm font-extrabold uppercase text-yellow transition-transform hover:rotate-1"
                >
                  Carregar foto
                </button>
              </div>
              {cameraError && <p className="text-sm text-magenta-soft">{cameraError}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {cameraOn && (
            <div className="relative overflow-hidden border-2 border-yellow">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline muted className="w-full -scale-x-100" />
              <div className="flex justify-center gap-3 bg-ink-soft p-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="focus-ring cut-tag bg-magenta px-6 py-2 text-sm font-extrabold uppercase text-cream"
                >
                  Capturar
                </button>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="focus-ring cut-tag border-2 border-cream/30 px-6 py-2 text-sm font-extrabold uppercase text-cream/70"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {hasPhoto && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                {(['square', 'story'] as Aspect[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => changeAspect(a)}
                    className={`cut-tag px-5 py-2 text-xs font-extrabold uppercase tracking-wide transition-transform ${
                      aspect === a ? 'rotate-1 bg-yellow text-ink' : 'text-cream/60'
                    }`}
                  >
                    {a === 'square' ? 'Quadrado · Feed' : 'Vertical · Stories'}
                  </button>
                ))}
              </div>

              <div className="mx-auto w-full max-w-sm touch-none">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-grab touch-none border-4 border-ink shadow-[8px_8px_0_0_#FF004E] active:cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>

              <label className="text-xs font-bold uppercase tracking-widest text-cream/50">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => changeZoom(Number(e.target.value))}
                  className="mt-2 block w-full accent-magenta"
                />
              </label>
              <p className="text-xs text-cream/40">Arrasta a foto para ajustar a posição por baixo da moldura.</p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => download('png')}
                  className="focus-ring cut-tag rotate-1 bg-magenta px-6 py-3 text-sm font-extrabold uppercase text-cream transition-transform hover:-rotate-1"
                >
                  Descarregar PNG
                </button>
                <button
                  type="button"
                  onClick={() => download('jpeg')}
                  className="focus-ring cut-tag -rotate-1 border-2 border-yellow px-6 py-3 text-sm font-extrabold uppercase text-yellow transition-transform hover:rotate-1"
                >
                  Descarregar JPEG
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-3 text-xs font-bold uppercase text-cream/40 hover:text-cream/70"
                >
                  Trocar foto
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="mt-2 border-t border-cream/10 pt-6">
                <p className="text-xs font-bold uppercase tracking-widest text-cream/50">Partilhar</p>

                <button
                  type="button"
                  onClick={shareImage}
                  disabled={shareState === 'sharing'}
                  className="focus-ring cut-tag mt-3 rotate-1 bg-yellow px-6 py-3 text-sm font-extrabold uppercase text-ink transition-transform hover:-rotate-1 disabled:opacity-50"
                >
                  {shareState === 'sharing' ? 'A abrir…' : `Partilhar agora ${EVENT.hashtag}`}
                </button>
                <p className="mt-2 text-xs text-cream/40">
                  Num telemóvel, isto abre o menu de partilha nativo — inclui o Estado do WhatsApp, Instagram e
                  Facebook.
                </p>

                {shareState === 'error' && (
                  <p role="alert" className="mt-3 text-xs text-magenta-soft">
                    Não foi possível abrir a partilha. Descarrega a imagem acima e partilha manualmente.
                  </p>
                )}

                {shareState === 'unsupported' && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring cut-tag border-2 border-cream/20 px-5 py-2.5 text-xs font-extrabold uppercase text-cream/80 transition-colors hover:border-yellow hover:text-cream"
                    >
                      WhatsApp
                    </a>
                    <a
                      href="https://www.instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring cut-tag border-2 border-cream/20 px-5 py-2.5 text-xs font-extrabold uppercase text-cream/80 transition-colors hover:border-yellow hover:text-cream"
                    >
                      Instagram
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring cut-tag border-2 border-cream/20 px-5 py-2.5 text-xs font-extrabold uppercase text-cream/80 transition-colors hover:border-yellow hover:text-cream"
                    >
                      Facebook
                    </a>
                    <p className="w-full text-xs text-cream/40">
                      O teu browser não permite anexar a imagem diretamente. Descarrega-a acima e anexa-a à
                      publicação, mensagem ou Estado do WhatsApp.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rot-1 h-fit border-2 border-cream/15 bg-ink-soft p-6 text-sm text-cream/70">
          <h3 className="text-sm font-bold uppercase tracking-widest text-magenta">Como funciona</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Tira uma foto com a câmara ou carrega uma existente.</li>
            <li>Escolhe o formato: quadrado para Instagram/Facebook ou vertical para Stories/WhatsApp.</li>
            <li>Arrasta e ajusta o zoom até ficares bem enquadrado.</li>
            <li>Descarrega e partilha com a hashtag {EVENT.hashtag}.</li>
          </ol>
          <p className="mt-6 text-xs text-cream/40">
            A composição acontece toda no teu browser — nenhuma foto é enviada ou guardada num servidor.
          </p>
        </div>
      </div>
    </div>
  );
}
