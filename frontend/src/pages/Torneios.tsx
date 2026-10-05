import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SectionHeading } from '../components/SectionHeading';
import { PaymentStep } from '../components/PaymentStep';
import { CheckoutStepper, type CheckoutStep } from '../components/CheckoutStepper';
import { BackButton, ErrorMessage, Field, PrimaryButton } from '../components/FormParts';
import { api, ApiError, type Tournament, type TournamentEntry, type TournamentPayment } from '../lib/api';
import { formatKz } from '../lib/format';
import { FREE_PLAY, TOURNAMENT_FORMAT, TOURNAMENT_RULES, TOURNAMENT_STEPS, tournamentWhen } from '../lib/tournaments';
import { EVENT } from '../lib/site-content';
import { loadTournamentCheckout, saveTournamentCheckout } from '../lib/checkout';

function availability(t: Tournament) {
  if (!t.registrationOpen) return { open: false, label: 'Inscrições fechadas' };
  if (t.spotsLeft <= 0) return { open: false, label: 'Esgotado' };
  return { open: true, label: `${t.spotsLeft} ${t.spotsLeft === 1 ? 'vaga' : 'vagas'}` };
}

export function Torneios() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [stored] = useState(loadTournamentCheckout);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<CheckoutStep>(stored ? 3 : 1);
  const [tournamentId, setTournamentId] = useState(stored?.entry.tournamentId ?? '');
  const [fullName, setFullName] = useState('');
  const [gamerTag, setGamerTag] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelledNotice, setCancelledNotice] = useState<string | null>(null);
  const [entry, setEntry] = useState<TournamentEntry | null>(stored?.entry ?? null);
  const [paymentId, setPaymentId] = useState(stored?.paymentId);
  const returnedWithoutCheckout = !stored && searchParams.has('pagamento');

  useEffect(() => {
    api.tournaments
      .list()
      .then((list) => {
        setTournaments(list);
        if (stored) return;
        const preselected = list.find((t) => t.id === searchParams.get('torneio') && availability(t).open);
        if (preselected) {
          setTournamentId(preselected.id);
          setStep(2);
        } else {
          setTournamentId(list.find((t) => availability(t).open)?.id ?? '');
        }
      })
      .catch(() => setError('Não foi possível carregar os torneios. Tenta novamente mais tarde.'))
      .finally(() => setLoading(false));
  }, [searchParams, stored]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const selected = tournaments.find((t) => t.id === tournamentId);

  function goToDetails(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected || !availability(selected).open) {
      setError('Escolhe um torneio com inscrições abertas.');
      return;
    }
    setStep(2);
  }

  async function register(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.tournaments.register(tournamentId, {
        fullName: fullName.trim(),
        gamerTag: gamerTag.trim(),
        contact: contact.trim(),
        email: email.trim(),
      });
      setEntry(created);
      saveTournamentCheckout({ entry: created });
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível submeter a inscrição. Verifica a ligação e tenta novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handlePaymentChange(payment: TournamentPayment | null) {
    if (!entry) return;
    setPaymentId(payment?.id);
    saveTournamentCheckout({ entry, paymentId: payment?.id });
  }

  function handleCancelled(message: string) {
    saveTournamentCheckout(null);
    setEntry(null);
    setPaymentId(undefined);
    setCancelledNotice(message);
    setStep(1);
    // As vagas mudaram entretanto: a inscrição cancelada libertou a sua.
    api.tournaments.list().then(setTournaments).catch(() => undefined);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Torneios" title="Entra na arena do Nexus" tone="magenta" />
      <p className="mt-4 max-w-2xl text-cream/70">
        Escolhe o torneio, indica os teus dados de jogador e paga a inscrição por Multicaixa Express ou por referência.
        A vaga só fica garantida quando o pagamento é confirmado. A inscrição não inclui a entrada no evento: precisas
        também de um{' '}
        <Link to="/bilhetes" className="font-bold text-yellow underline underline-offset-4">
          bilhete
        </Link>
        .
      </p>

      <CheckoutStepper current={step} labels={TOURNAMENT_STEPS} />

      {cancelledNotice && step === 1 && (
        <div role="alert" className="mt-8 border-l-4 border-magenta bg-magenta/10 p-4 text-sm text-cream">
          {cancelledNotice}
        </div>
      )}

      {returnedWithoutCheckout && !cancelledNotice && step === 1 && (
        <div role="status" className="mt-8 border-l-4 border-yellow bg-yellow/10 p-4 text-sm text-cream/85">
          O pagamento não foi concluído e a inscrição foi cancelada. Se achas que pagaste, contacta a {EVENT.orgName}{' '}
          pelo {EVENT.orgPhone} com o telemóvel que usaste na inscrição.
        </div>
      )}

      {step === 1 && (
        <form onSubmit={goToDetails} className="mt-10">
          <fieldset disabled={loading}>
            <legend className="text-sm font-bold uppercase tracking-widest text-yellow">Escolhe o teu torneio</legend>
            {!loading && tournaments.length === 0 && !error && (
              <p className="mt-5 text-sm text-cream/60">Os torneios vão ser anunciados em breve.</p>
            )}
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {tournaments.map((t, i) => {
                const active = t.id === tournamentId;
                const { open, label } = availability(t);
                const when = tournamentWhen(t);
                return (
                  <label
                    key={t.id}
                    className={`${i % 2 === 0 ? 'rot-1' : '-rotate-1'} relative flex flex-col border-2 bg-ink-soft p-6 transition-all focus-within:ring-2 focus-within:ring-yellow ${
                      !open
                        ? 'cursor-not-allowed border-cream/10 opacity-60'
                        : active
                          ? 'cursor-pointer border-yellow shadow-[6px_6px_0_0_#FFD527]'
                          : 'cursor-pointer border-cream/15 hover:-translate-y-1 hover:rotate-0 hover:border-cream/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tournament"
                      value={t.id}
                      checked={active}
                      disabled={!open}
                      onChange={() => setTournamentId(t.id)}
                      className="sr-only"
                    />
                    {t.platform && (
                      <span className="mb-2 text-xs font-bold uppercase tracking-widest text-magenta">{t.platform}</span>
                    )}
                    <span className="text-2xl font-extrabold text-cream">{t.game}</span>
                    <span className="mt-1 text-sm text-cream/60">{t.name}</span>
                    {t.description && <span className="mt-3 text-sm text-cream/70">{t.description}</span>}
                    <span className="mt-4 text-sm text-cream/70">{when ?? 'Dia e hora a anunciar'}</span>
                    <span className="mt-5 flex items-end justify-between gap-3 border-t border-cream/10 pt-4">
                      <span className="text-2xl font-extrabold text-yellow">{formatKz(t.entryFeeKz)}</span>
                      <span
                        className={`cut-tag px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                          open ? 'bg-cream/10 text-cream' : 'bg-magenta/20 text-magenta-soft'
                        }`}
                      >
                        {label}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <ErrorMessage message={error} />

          <div className="mt-8 flex justify-end">
            <PrimaryButton type="submit" disabled={loading || !selected || !availability(selected).open}>
              Continuar
            </PrimaryButton>
          </div>

          <Rules />
        </form>
      )}

      {step === 2 && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={register}>
            <div className="grid gap-5">
              <Field label="Nome completo" htmlFor="fullName">
                <input
                  id="fullName"
                  required
                  minLength={3}
                  maxLength={120}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                  placeholder="O teu nome completo"
                  autoFocus
                />
              </Field>

              <Field label="Nome de jogador" htmlFor="gamerTag">
                <input
                  id="gamerTag"
                  required
                  minLength={2}
                  maxLength={40}
                  autoComplete="off"
                  value={gamerTag}
                  onChange={(e) => setGamerTag(e.target.value)}
                  className="input"
                  placeholder="PSN ID, gamertag ou nickname"
                />
                <p className="mt-1.5 text-xs text-cream/50">É o nome que aparece no chaveamento do torneio.</p>
              </Field>

              <Field label="Telemóvel" htmlFor="contact">
                <input
                  id="contact"
                  required
                  minLength={9}
                  maxLength={20}
                  inputMode="tel"
                  autoComplete="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="input"
                  placeholder="923 456 789"
                />
              </Field>

              <Field label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  required
                  maxLength={160}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="email@exemplo.com"
                />
                <p className="mt-1.5 text-xs text-cream/50">É para aqui que enviamos a confirmação da inscrição.</p>
              </Field>
            </div>

            <ErrorMessage message={error} />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <BackButton
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
              />
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'A inscrever…' : 'Inscrever e pagar'}
              </PrimaryButton>
            </div>
          </form>

          <Summary tournament={selected} />
        </div>
      )}

      {step === 3 && entry && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm text-cream/70">
              Inscrição registada em nome de <span className="font-bold text-cream">{entry.fullName}</span> (
              {entry.gamerTag}). Falta só o pagamento.
            </p>
            <div className="mt-5">
              <PaymentStep
                orderId={entry.id}
                amountKz={entry.tournament.entryFeeKz}
                defaultPhone={entry.contact}
                startPayment={(method, phone) => api.tournamentPayments.create({ entryId: entry.id, method, phone })}
                fetchPayment={api.tournamentPayments.status}
                initialPaymentId={paymentId}
                onPaymentChange={handlePaymentChange}
                onPaid={() => navigate(`/torneios/sucesso?inscricao=${entry.id}`)}
                onCancelled={handleCancelled}
              />
            </div>
          </div>

          <Summary tournament={selected} fallback={entry.tournament} contact={entry.contact} />
        </div>
      )}
    </div>
  );
}

function Rules() {
  return (
    <section className="mt-16 border-t border-cream/10 pt-10" aria-labelledby="regulamento">
      <h2 id="regulamento" className="text-sm font-bold uppercase tracking-widest text-yellow">
        Regulamento
      </h2>
      <p className="mt-4 max-w-2xl text-sm text-cream/70">
        Os torneios são em 1 contra 1, com eliminação simples: quem perde o confronto sai da competição e o último jogador
        em prova é o campeão da sua modalidade.
      </p>

      <ol className="mt-6 grid gap-2 sm:grid-cols-5">
        {TOURNAMENT_FORMAT.map((step) => (
          <li key={step.phase} className="border-2 border-cream/15 bg-ink-soft p-3">
            <span className="block text-xs font-bold uppercase tracking-widest text-magenta">{step.phase}</span>
            <span className="mt-1 block text-sm font-extrabold text-cream">{step.format}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-2">
        {TOURNAMENT_RULES.map((rule) => (
          <details key={rule.title} className="group border-2 border-cream/10 bg-ink-soft">
            <summary className="focus-ring cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-cream">
              <span className="mr-2 inline-block text-yellow transition-transform group-open:rotate-90" aria-hidden="true">
                ›
              </span>
              {rule.title}
            </summary>
            <ul className="space-y-2 px-4 pb-4 text-sm text-cream/70">
              {rule.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <p className="mt-8 max-w-2xl border-l-4 border-yellow bg-yellow/10 p-4 text-sm text-cream/85">
        Para além dos torneios, há consolas de jogo livre durante o evento: {formatKz(FREE_PLAY.priceKz)} por{' '}
        {FREE_PLAY.minutes} minutos, contados a partir do início da sessão e sujeitos à disponibilidade das estações.
      </p>
    </section>
  );
}

function Summary({
  tournament,
  fallback,
  contact,
}: {
  tournament?: Tournament;
  /** Dados guardados com a inscrição, para quando a lista ainda não carregou. */
  fallback?: TournamentEntry['tournament'];
  contact?: string;
}) {
  const name = tournament?.name ?? fallback?.name;
  const fee = tournament?.entryFeeKz ?? fallback?.entryFeeKz;
  const when = tournament ? tournamentWhen(tournament) : null;
  return (
    <aside className="rot-1 h-fit border-2 border-cream/15 bg-ink-soft p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-magenta">Resumo</h3>
      {name && fee !== undefined ? (
        <div className="mt-4 space-y-2 text-sm text-cream/80">
          {tournament?.platform && (
            <p className="text-xs font-bold uppercase tracking-widest text-cream/50">{tournament.platform}</p>
          )}
          <p className="text-lg font-extrabold text-cream">{name}</p>
          {when && <p>{when}</p>}
          <p>{EVENT.venue}</p>
          <p className="pt-3 text-2xl font-extrabold text-yellow">{formatKz(fee)}</p>
          <p className="text-xs text-cream/50">Taxa de inscrição por jogador</p>
          {contact && <p className="pt-2 text-xs text-cream/50">Contacto: {contact}</p>}
        </div>
      ) : (
        <p className="mt-4 text-sm text-cream/50">Escolhe um torneio para veres o resumo.</p>
      )}
    </aside>
  );
}
