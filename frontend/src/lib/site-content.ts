import logoXyami from '../assets/sponsors/xyami.svg';
import logoPolisakidila from '../assets/sponsors/polisakidila.png';
import logoMuvi from '../assets/sponsors/muvi.png';
import logoTriboAku from '../assets/sponsors/tribo-aku.svg';

/**
 * Conteúdo real do evento, extraído dos materiais de marca fornecidos pela
 * organização (banner principal e tabela de preços). Onde a organização ainda
 * não forneceu informação (programação detalhada, dados bancários), o texto
 * está claramente assinalado como placeholder — ver README para a lista
 * completa do que falta confirmar antes do lançamento.
 *
 * Os logótipos dos patrocinadores em `partners[].logo` são placeholders
 * fictícios (src/assets/sponsors) até a organização fornecer as marcas
 * oficiais.
 */
export const EVENT = {
  name: 'Kwamikon Nexus',
  year: 2026,
  dateLabel: '31 de outubro e 1 de novembro',
  timeLabel: 'a partir das 10h',
  /** Angola (WAT) não observa horário de verão — UTC+1 fixo. */
  startsAtIso: '2026-10-31T10:00:00+01:00',
  venue: 'Xyami Nova Vida',
  tagline: 'Cosplay · Festa · Nerdologia',
  subline: 'Nova data, novo local & novo formato',
  hashtag: '#EUVOU',
  orgName: 'Conexão Nerd Angola',
  orgPhone: '942 027 116',
  partners: [
    { name: 'Xyami', detail: 'O Centro da Nossa Terra', url: undefined as string | undefined, logo: logoXyami },
    {
      name: 'Polisakidila',
      detail: 'www.polisakidila.com',
      url: 'https://www.polisakidila.com' as string | undefined,
      logo: logoPolisakidila,
    },
    { name: 'Muvi', detail: 'Produtora', url: undefined as string | undefined, logo: logoMuvi },
    { name: 'Tribo Aku', detail: '', url: undefined as string | undefined, logo: logoTriboAku },
  ],
} as const;

export const PAYMENT_INSTRUCTIONS_PLACEHOLDER = `Os dados bancários e a referência Multicaixa Express para pagamento vão ser confirmados pela organização. Depois de submeteres a reserva, entra em contacto com a ${EVENT.orgName} pelo número ${EVENT.orgPhone} para concluir o pagamento e confirmar o teu lugar.`;

export const FAQ_ITEMS = [
  {
    question: 'O que é o Kwamikon Nexus?',
    answer:
      'É a edição 2026 do Kwamikon, o maior encontro de cultura pop de Angola — anime, gaming, cinema, banda desenhada e cosplay num só espaço. O nome "Nexus" marca a mudança de formato: o evento deixa de ser só um encontro temático e passa a ser o ponto onde todos esses universos se cruzam, com novo local e nova escala.',
  },
  {
    question: 'Quando e onde é o evento?',
    answer: `Nos dias ${EVENT.dateLabel} de ${EVENT.year}, ${EVENT.timeLabel}, no ${EVENT.venue}.`,
  },
  {
    question: 'Como funciona a reserva de bilhete?',
    answer:
      'Escolhes o tipo de bilhete, preenches o formulário com os teus dados e submetes o pedido. A reserva fica com o estado "pendente" até a organização confirmar o pagamento manual (transferência ou Multicaixa Express). Depois de confirmada, recebes um bilhete com QR code.',
  },
  {
    question: 'Posso pagar o bilhete online, no site?',
    answer:
      'Ainda não. Nesta fase o pagamento é feito fora do site (transferência bancária ou Multicaixa Express) e a organização confirma manualmente cada reserva.',
  },
  {
    question: 'O que é a moldura "Eu vou"?',
    answer:
      'Uma funcionalidade para anunciares que vais ao Kwamikon Nexus: tiras ou carregas uma foto, o site sobrepõe automaticamente a moldura oficial do evento, e descarregas a imagem para partilhares nas redes com a hashtag #EUVOU. Tudo processado no teu telemóvel ou computador — a tua foto nunca é enviada para nenhum servidor.',
  },
  {
    question: 'Posso entrar com o bilhete no telemóvel?',
    answer:
      'Sim. Depois da confirmação, o QR code do teu bilhete pode ser apresentado diretamente do telemóvel à entrada — não precisas de o imprimir.',
  },
] as const;
