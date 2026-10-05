import { formatEventDay } from './format';

export const TOURNAMENT_STEPS = ['Torneio', 'Os teus dados', 'Pagamento', 'Confirmação'];

/** "31 de outubro, 14:00", ou null enquanto a organização não definir o dia. */
export function tournamentWhen(t: { eventDay: string | null; startTime: string | null }) {
  if (!t.eventDay) return null;
  return `${formatEventDay(t.eventDay)}${t.startTime ? `, ${t.startTime}` : ''}`;
}

/** Fases do chaveamento e formato de cada uma (regulamento "Torneio CNA"). */
export const TOURNAMENT_FORMAT = [
  { phase: 'Fase inicial', format: 'Jogo único' },
  { phase: 'Oitavos de final', format: 'Melhor de 3 (BO3)' },
  { phase: 'Quartos de final', format: 'Melhor de 3 (BO3)' },
  { phase: 'Semifinal', format: 'Melhor de 3 (BO3)' },
  { phase: 'Grande final', format: 'Melhor de 5 (BO5)' },
];

/** Regras gerais comuns ao EA SPORTS FC 26 e ao Mortal Kombat 11 (regulamento "Torneio CNA"). */
export const TOURNAMENT_RULES = [
  {
    title: 'Inscrição',
    items: [
      'A inscrição só é válida depois de o pagamento ser confirmado.',
      'A inscrição é pessoal e não pode ser transferida para outro jogador depois do início do torneio.',
    ],
  },
  {
    title: 'Sistema da competição',
    items: [
      'Eliminação simples, em 1 contra 1: quem perde o confronto é eliminado e o vencedor avança até à final.',
      'Depois de as inscrições fecharem, a organização distribui os participantes no chaveamento e pode sortear os confrontos antes do início.',
      'No EA SPORTS FC 26 joga-se com uma equipa disponível no jogo, sem trocar de jogador a meio de um confronto. Configurações especiais são comunicadas antes do início.',
      'No Mortal Kombat 11 cada participante escolhe o seu personagem e as partidas são disputadas em rounds. No BO3 avança quem vencer 2 partidas; na final BO5 é preciso vencer 3.',
    ],
  },
  {
    title: 'Atrasos e falta de comparência',
    items: [
      'Está presente no horário indicado pela organização. Passado o período de tolerância, pode ser atribuída derrota por falta de comparência (W.O.).',
    ],
  },
  {
    title: 'Equipamento',
    items: [
      'As partidas são jogadas nos equipamentos da organização. Podes usar o teu comando, se for compatível e aprovado pela organização.',
      'Qualquer problema técnico deve ser comunicado antes do confronto ou logo que aconteça. A organização decide se a partida recomeça, continua ou se repete.',
    ],
  },
  {
    title: 'Conduta e fraude',
    items: [
      'Não são tolerados insultos, ameaças, agressões, provocações excessivas nem comportamentos antidesportivos.',
      'É proibido usar batota, exploits intencionais, software externo ou qualquer método que dê vantagem indevida. Uma tentativa comprovada de manipular o resultado pode levar à desclassificação imediata.',
      'Danos intencionais aos equipamentos podem levar à desclassificação e à responsabilização pelos danos.',
    ],
  },
  {
    title: 'Decisões da organização',
    items: [
      'A organização interpreta e aplica o regulamento, e analisa as situações que ele não prevê. As decisões tomadas durante o torneio devem ser respeitadas.',
    ],
  },
];

/** Consolas de jogo livre, fora das competições oficiais. */
export const FREE_PLAY = { minutes: 20, priceKz: 500 };
