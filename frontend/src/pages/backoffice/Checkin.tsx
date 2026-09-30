import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../lib/api';
import { formatEventDay, formatLuandaTime } from '../../lib/format';

const QUEUE_KEY = 'kwamikon_checkin_queue';
const SCANNER_ID = 'checkin-scanner';

type Feedback = {
  tone: 'ok' | 'warn' | 'error' | 'info';
  title: string;
  detail?: string;
};

/** Leitura feita sem rede: guardamos a hora para contar no dia certo quando sincronizar. */
type QueuedScan = { code: string; scannedAt: string };

type Today = { day: string; isEventDay: boolean; eventDays: string[]; entries: number };

function readQueue(): QueuedScan[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as (QueuedScan | string)[];
    // Filas antigas guardavam só o código.
    return raw.map((item) => (typeof item === 'string' ? { code: item, scannedAt: new Date().toISOString() } : item));
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedScan[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function Checkin() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [scanning, setScanning] = useState(false);
  const [queueSize, setQueueSize] = useState(() => readQueue().length);
  const [online, setOnline] = useState(navigator.onLine);
  const [manualCode, setManualCode] = useState('');
  const [today, setToday] = useState<Today | null>(null);

  function refreshToday() {
    api.checkin.today().then(setToday).catch(() => undefined);
  }

  useEffect(() => {
    function goOnline() {
      setOnline(true);
      void syncQueue();
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    void syncQueue();
    refreshToday();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  async function syncQueue() {
    const queue = readQueue();
    if (queue.length === 0 || !navigator.onLine) return;

    const remaining: QueuedScan[] = [];
    for (const item of queue) {
      try {
        await api.checkin.validate(item.code, item.scannedAt);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueueSize(remaining.length);
  }

  async function processCode(code: string) {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const result = await api.checkin.validate(code);
      switch (result.outcome) {
        case 'ok':
          setFeedback({
            tone: 'ok',
            title: `Entrada validada · ${formatEventDay(result.eventDay)}`,
            detail: `${result.fullName} · ${result.ticketType} × ${result.quantity}${
              result.remainingDays.length > 0
                ? ` · ainda pode entrar a ${result.remainingDays.map(formatEventDay).join(' e ')}`
                : ' · último dia deste bilhete'
            }`,
          });
          refreshToday();
          break;
        case 'already_used':
          setFeedback({
            tone: 'warn',
            title: 'Bilhete já utilizado hoje',
            detail: `${result.fullName}${
              result.checkedInAt ? ` · entrou às ${formatLuandaTime(result.checkedInAt)}` : ''
            }. Cada bilhete dá uma entrada por dia.`,
          });
          break;
        case 'not_event_day':
          setFeedback({
            tone: 'error',
            title: 'Bilhete não válido hoje',
            detail: `Os bilhetes só dão entrada a ${result.eventDays.map(formatEventDay).join(' e ')}.`,
          });
          break;
        case 'not_confirmed':
          setFeedback({ tone: 'warn', title: 'Bilhete ainda não confirmado', detail: `Estado atual: ${result.status}` });
          break;
        case 'not_found':
          setFeedback({ tone: 'error', title: 'Código inválido', detail: 'Este QR code não corresponde a nenhum bilhete.' });
          break;
      }
    } catch {
      const queue = readQueue();
      queue.push({ code, scannedAt: new Date().toISOString() });
      writeQueue(queue);
      setQueueSize(queue.length);
      setFeedback({
        tone: 'info',
        title: 'Sem ligação — guardado para sincronizar',
        detail: 'O código foi guardado e vai ser validado assim que a ligação voltar.',
      });
    } finally {
      setTimeout(() => {
        busyRef.current = false;
      }, 1500);
    }
  }

  async function startScanner() {
    setFeedback(null);
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          void processCode(decodedText);
        },
        undefined,
      );
      setScanning(true);
    } catch {
      setFeedback({ tone: 'error', title: 'Não foi possível aceder à câmara', detail: 'Verifica as permissões do browser.' });
    }
  }

  async function stopScanner() {
    try {
      await scannerRef.current?.stop();
    } catch {
      // já parado
    }
    setScanning(false);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) {
      void processCode(manualCode.trim());
      setManualCode('');
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold text-cream">Check-in</h1>
      <p className="mt-2 text-sm text-cream/60">
        Aponta a câmara ao QR code do bilhete para validar a entrada.
      </p>

      {today && (
        <div
          className={`mt-4 border-l-4 px-4 py-3 text-sm ${
            today.isEventDay ? 'border-emerald-400 bg-emerald-400/10' : 'border-yellow bg-yellow/10'
          }`}
        >
          {today.isEventDay ? (
            <p className="text-cream">
              <span className="font-extrabold">
                Dia {today.eventDays.indexOf(today.day) + 1} · {formatEventDay(today.day)}
              </span>
              <span className="text-cream/60"> · {today.entries} entradas validadas</span>
            </p>
          ) : (
            <p className="text-cream">
              <span className="font-extrabold">Hoje não é dia de evento.</span>
              <span className="text-cream/60">
                {' '}
                Os bilhetes só dão entrada a {today.eventDays.map(formatEventDay).join(' e ')}.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-yellow'}`} />
        <span className="text-cream/50">{online ? 'Ligado' : 'Sem ligação'}</span>
        {queueSize > 0 && <span className="text-yellow">· {queueSize} por sincronizar</span>}
      </div>

      <div id={SCANNER_ID} className="mt-6 overflow-hidden border-2 border-cream/15" />

      <div className="mt-4 flex gap-3">
        {!scanning ? (
          <button
            type="button"
            onClick={startScanner}
            className="focus-ring cut-tag bg-magenta px-6 py-3 text-sm font-extrabold uppercase text-cream"
          >
            Iniciar câmara
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="focus-ring cut-tag border-2 border-cream/30 px-6 py-3 text-sm font-extrabold uppercase text-cream/70"
          >
            Parar câmara
          </button>
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="mt-6 flex gap-2">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Ou introduz o código manualmente"
          className="input bg-ink-soft"
        />
        <button type="submit" className="cut-tag border-2 border-yellow px-4 py-2 text-xs font-extrabold uppercase text-yellow">
          Validar
        </button>
      </form>

      {feedback && (
        <div
          role="status"
          className={`mt-6 border-l-4 p-5 ${
            feedback.tone === 'ok'
              ? 'border-emerald-400 bg-emerald-400/10'
              : feedback.tone === 'warn'
                ? 'border-yellow bg-yellow/10'
                : feedback.tone === 'error'
                  ? 'border-magenta bg-magenta/10'
                  : 'border-cream/30 bg-cream/5'
          }`}
        >
          <p className="font-extrabold text-cream">{feedback.title}</p>
          {feedback.detail && <p className="mt-1 text-sm text-cream/70">{feedback.detail}</p>}
        </div>
      )}
    </div>
  );
}
