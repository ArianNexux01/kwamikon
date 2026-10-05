import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EVENT_INFO, longDayLabel } from '../common/event-info';
import { MailService } from '../mail/mail.service';

type ConfirmedEntry = {
  id: string;
  fullName: string;
  gamerTag: string;
  email: string;
  tournament: {
    name: string;
    game: string;
    platform: string | null;
    eventDay: string | null;
    startTime: string | null;
  };
};

/** Envia a confirmação da inscrição no torneio assim que o pagamento é confirmado. */
@Injectable()
export class TournamentMailService {
  private readonly logger = new Logger(TournamentMailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Envia uma única vez, mesmo que a confirmação chegue por vários caminhos ao mesmo
   * tempo: o envio é "reservado" com uma actualização condicional antes de sair.
   * Nunca lança: uma falha de email não pode desfazer a confirmação do pagamento.
   */
  async sendOnce(entryId: string): Promise<void> {
    const claimed = await this.prisma.tournamentEntry.updateMany({
      where: { id: entryId, emailSentAt: null, status: 'CONFIRMADO' },
      data: { emailSentAt: new Date() },
    });
    if (claimed.count === 0) return;

    try {
      const entry = await this.prisma.tournamentEntry.findUniqueOrThrow({
        where: { id: entryId },
        include: { tournament: true },
      });
      const sent = await this.mail.send({
        to: entry.email,
        subject: `Inscrição confirmada: ${entry.tournament.name}`,
        text: this.text(entry),
        html: this.html(entry),
      });
      if (sent) {
        this.logger.log(
          `Confirmação da inscrição ${entryId} enviada para ${entry.email}.`,
        );
      } else {
        await this.release(entryId);
      }
    } catch (err) {
      this.logger.error(
        `Falha ao enviar a confirmação da inscrição ${entryId}: ${(err as Error).message}`,
      );
      await this.release(entryId);
    }
  }

  private release(entryId: string) {
    return this.prisma.tournamentEntry.update({
      where: { id: entryId },
      data: { emailSentAt: null },
    });
  }

  private when(e: ConfirmedEntry) {
    const { eventDay, startTime } = e.tournament;
    if (!eventDay) return 'Data e hora a anunciar pela organização';
    return `${longDayLabel(eventDay)}${startTime ? `, às ${startTime}` : ''}`;
  }

  private text(e: ConfirmedEntry) {
    return [
      `Olá ${firstName(e.fullName)},`,
      '',
      `O teu pagamento foi confirmado e estás inscrito no ${e.tournament.name}.`,
      '',
      `Jogo: ${gameLabel(e)}`,
      `Nome de jogador: ${e.gamerTag}`,
      `Quando: ${this.when(e)}`,
      `Onde: ${EVENT_INFO.venue}`,
      '',
      'A inscrição no torneio não inclui a entrada no evento: precisas também de um bilhete do Kwamikon Nexus. Está presente no horário indicado pela organização: passado o período de tolerância, o confronto pode ser dado como perdido por falta de comparência (W.O.).',
      '',
      `Dúvidas? Contacta a ${EVENT_INFO.orgName} pelo ${EVENT_INFO.orgPhone}.`,
    ].join('\n');
  }

  private html(e: ConfirmedEntry) {
    const row = (label: string, value: string) =>
      `<tr><td style="padding:8px 0;color:#9a918b;font-size:13px;">${label}</td><td style="padding:8px 0;color:#f5efe6;font-size:14px;font-weight:700;text-align:right;">${escapeHtml(value)}</td></tr>`;

    return `<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:#161616;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#161616;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#262220;border:2px solid #3a3431;">
        <tr><td style="background:#FF004E;padding:16px 24px;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">${EVENT_INFO.name}</td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 8px;color:#f5efe6;font-size:22px;font-weight:800;">${escapeHtml(firstName(e.fullName))}, estás no torneio!</p>
          <p style="margin:0 0 20px;color:#c9c0b8;font-size:14px;line-height:1.5;">O teu pagamento foi confirmado e a tua inscrição no ${escapeHtml(e.tournament.name)} está garantida.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #3a3431;border-bottom:1px solid #3a3431;">
            ${row('Jogo', gameLabel(e))}
            ${row('Nome de jogador', e.gamerTag)}
            ${row('Quando', this.when(e))}
            ${row('Onde', EVENT_INFO.venue)}
          </table>
          <p style="margin:20px 0 0;color:#c9c0b8;font-size:13px;line-height:1.5;">A inscrição no torneio <strong style="color:#f5efe6;">não inclui a entrada no evento</strong>: precisas também de um bilhete do Kwamikon Nexus. Está presente no horário indicado pela organização: passado o período de tolerância, o confronto pode ser dado como perdido por falta de comparência (W.O.).</p>
          <p style="margin:16px 0 0;color:#9a918b;font-size:12px;line-height:1.5;">Dúvidas? Contacta a ${EVENT_INFO.orgName} pelo ${EVENT_INFO.orgPhone}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}

function gameLabel(e: ConfirmedEntry) {
  const { game, platform } = e.tournament;
  return platform ? `${game} (${platform})` : game;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
