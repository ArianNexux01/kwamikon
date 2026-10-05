import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SectionHeading } from '../components/SectionHeading';
import { CheckoutStepper } from '../components/CheckoutStepper';
import { api, ApiError, type EntrySummary } from '../lib/api';
import { formatKz } from '../lib/format';
import { EVENT } from '../lib/site-content';
import { loadTournamentCheckout, saveTournamentCheckout } from '../lib/checkout';
import { TOURNAMENT_STEPS, tournamentWhen } from '../lib/tournaments';

/** Enquanto o pagamento está por confirmar: rápido nos primeiros minutos, depois mais espaçado. */
const FAST_POLL_MS = 4_000;
const SLOW_POLL_MS = 20_000;
const FAST_POLL_WINDOW_MS = 2 * 60_000;
const EMAIL_CHECKS = 5;

/**
 * Destino do regresso da página de pagamento (/api/tournament-payments/return/:inscricao).
 * Só dá a inscrição como garantida quando o backend a confirma.
 */
export function TorneioSucesso() {
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('inscricao');
  const [entry, setEntry] = useState<EntrySummary | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!entryId) return;
    const startedAt = Date.now();
    let emailChecks = 0;
    let timer: number;
    let cancelled = false;

    function schedule(delay: number) {
      timer = window.setTimeout(load, delay);
    }

    function load() {
      api.tournamentEntries
        .summary(entryId!)
        .then((current) => {
          if (cancelled) return;
          setEntry(current);
          if (current.status !== 'PENDENTE' && loadTournamentCheckout()?.entry.id === current.id) {
            saveTournamentCheckout(null);
          }
          if (current.status === 'CONFIRMADO') {
            if (!current.emailSent && emailChecks++ < EMAIL_CHECKS) schedule(FAST_POLL_MS);
          } else if (current.status === 'PENDENTE' && current.paymentStatus === 'pending') {
            schedule(Date.now() - startedAt < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && (err.status === 404 || err.status === 400)) setNotFound(true);
          else schedule(SLOW_POLL_MS);
        });
    }

    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [entryId]);

  if (!entryId || notFound) {
    return (
      <Shell step={1}>
        <p className="mt-10 text-cream/70">Não encontrámos esta inscrição.</p>
        <BackToTournaments label="Ir para os torneios" />
      </Shell>
    );
  }

  if (!entry) {
    return (
      <Shell step={4}>
        <p className="mt-10 text-cream/60">A confirmar a tua inscrição…</p>
      </Shell>
    );
  }

  if (entry.status === 'PENDENTE' && entry.paymentStatus === 'pending') {
    return (
      <Shell step={3}>
        <div className="mt-10 max-w-2xl border-2 border-yellow/40 bg-ink-soft p-6">
          <p className="flex items-center gap-2 font-extrabold text-yellow">
            <span className="h-2 w-2 animate-pulse rounded-full bg-yellow" aria-hidden="true" />A confirmar o teu
            pagamento
          </p>
          <p className="mt-3 text-sm text-cream/70">
            Assim que a confirmação chegar, a tua vaga fica garantida e enviamos a confirmação para {entry.email}. Se
            escolheste pagar por referência, a confirmação só chega depois de a pagares. Podes fechar esta página.
          </p>
        </div>
      </Shell>
    );
  }

  if (entry.status !== 'CONFIRMADO') {
    return (
      <Shell step={3}>
        <div role="alert" className="mt-10 max-w-2xl border-l-4 border-magenta bg-magenta/10 p-5 text-sm text-cream">
          O pagamento não foi concluído, ou não foi confirmado a tempo, e a inscrição foi cancelada. Faz uma nova
          inscrição para tentares outra vez. Se achas que pagaste, contacta a {EVENT.orgName} pelo {EVENT.orgPhone}.
        </div>
        <BackToTournaments label="Fazer uma nova inscrição" />
      </Shell>
    );
  }

  const when = tournamentWhen(entry.tournament);

  return (
    <Shell step={4}>
      <div className="mt-10 max-w-2xl">
        <span className="inline-block -rotate-2 cut-tag bg-yellow px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-ink">
          Inscrição confirmada
        </span>
        <h2 className="mt-6 text-3xl font-extrabold text-cream sm:text-4xl">
          Prepara o comando, {entry.fullName.split(' ')[0]}!
        </h2>

        <div className="mt-8 space-y-3 border-2 border-cream/15 bg-ink-soft p-6">
          <Row label="Torneio" value={entry.tournament.name} />
          <Row label="Jogo" value={entry.tournament.platform ? `${entry.tournament.game} (${entry.tournament.platform})` : entry.tournament.game} />
          <Row label="Nome de jogador" value={entry.gamerTag} />
          <Row label="Quando" value={when ?? 'A anunciar pela organização'} />
          <Row label="Onde" value={EVENT.venue} />
          <Row label="Total pago" value={formatKz(entry.amountKz)} />
        </div>

        <p className="mt-6 border-l-4 border-emerald-400 bg-emerald-400/10 p-4 text-sm text-cream/85">
          {entry.emailSent
            ? `Enviámos a confirmação para ${entry.email}. Se não a encontrares, vê a pasta de spam.`
            : `Estamos a enviar a confirmação para ${entry.email}.`}
        </p>

        <p className="mt-6 text-sm text-cream/60">
          A inscrição não inclui a entrada no evento. Se ainda não tens bilhete,{' '}
          <Link to="/bilhetes" className="font-bold text-yellow underline underline-offset-4">
            garante-o aqui
          </Link>
          . Para qualquer dúvida contacta a {EVENT.orgName} pelo {EVENT.orgPhone}.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ step, children }: { step: 1 | 3 | 4; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Torneios" title="Entra na arena do Nexus" tone="magenta" />
      <CheckoutStepper current={step} labels={TOURNAMENT_STEPS} />
      {children}
    </div>
  );
}

function BackToTournaments({ label }: { label: string }) {
  return (
    <Link
      to="/torneios"
      className="focus-ring mt-6 inline-block cut-tag bg-magenta px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-cream"
    >
      {label}
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-cream/10 pb-2 text-sm">
      <span className="text-cream/50">{label}</span>
      <span className="text-right font-semibold text-cream">{value}</span>
    </div>
  );
}
