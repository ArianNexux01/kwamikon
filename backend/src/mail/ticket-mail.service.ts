import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { parseEventDays } from '../common/event-days';
import { daysLabel, EVENT_INFO } from '../common/event-info';
import { MailService } from './mail.service';

type TicketReservation = {
  id: string;
  fullName: string;
  email: string | null;
  quantity: number;
  qrCode: string | null;
  ticketType: { name: string };
};

/** Envia o bilhete com QR code por email assim que a reserva fica confirmada. */
@Injectable()
export class TicketMailService {
  private readonly logger = new Logger(TicketMailService.name);
  private readonly eventDays: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.eventDays = parseEventDays(config.get<string>('EVENT_DAYS'));
  }

  /**
   * Envia o bilhete uma única vez. A confirmação pode chegar por vários caminhos
   * quase ao mesmo tempo (regresso da página de pagamento, webhook, polling), por
   * isso o envio é "reservado" com uma actualização condicional antes de sair.
   * Nunca lança: uma falha de email não pode desfazer a confirmação do pagamento.
   */
  async sendOnce(reservationId: string): Promise<void> {
    const claimed = await this.prisma.reservation.updateMany({
      where: {
        id: reservationId,
        ticketEmailSentAt: null,
        email: { not: null },
        qrCode: { not: null },
      },
      data: { ticketEmailSentAt: new Date() },
    });
    if (claimed.count === 0) return;

    try {
      const sent = await this.deliver(reservationId);
      if (!sent) await this.releaseClaim(reservationId);
    } catch (err) {
      this.logger.error(
        `Falha ao enviar o bilhete da reserva ${reservationId}: ${(err as Error).message}`,
      );
      await this.releaseClaim(reservationId);
    }
  }

  /** Backoffice: reenvia o bilhete, mesmo que já tenha sido enviado. */
  async resend(reservationId: string): Promise<{ sentTo: string }> {
    const reservation = await this.load(reservationId);
    if (!reservation.qrCode) {
      throw new BadRequestException(
        'Esta reserva ainda não tem bilhete confirmado.',
      );
    }
    if (!reservation.email) {
      throw new BadRequestException('Esta reserva não tem email associado.');
    }
    if (!(await this.deliver(reservationId))) {
      throw new BadRequestException(
        'O envio de email não está configurado (SMTP_HOST).',
      );
    }
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { ticketEmailSentAt: new Date() },
    });
    return { sentTo: reservation.email };
  }

  private async deliver(reservationId: string): Promise<boolean> {
    const reservation = await this.load(reservationId);
    if (!reservation.email || !reservation.qrCode) return false;

    const qrPng = await QRCode.toBuffer(reservation.qrCode, {
      margin: 2,
      width: 480,
    });
    const sent = await this.mail.send({
      to: reservation.email,
      subject: `O teu bilhete para o ${EVENT_INFO.name}`,
      text: this.text(reservation),
      html: this.html(reservation),
      attachments: [
        { filename: 'bilhete-qr.png', content: qrPng, cid: 'bilhete-qr' },
        { filename: 'bilhete-kwamikon-nexus.png', content: qrPng },
      ],
    });
    if (sent) {
      this.logger.log(
        `Bilhete da reserva ${reservation.id} enviado para ${reservation.email}.`,
      );
    }
    return sent;
  }

  private load(reservationId: string): Promise<TicketReservation> {
    return this.prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { ticketType: true },
    });
  }

  private releaseClaim(reservationId: string) {
    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { ticketEmailSentAt: null },
    });
  }

  private text(r: TicketReservation) {
    return [
      `Olá ${firstName(r.fullName)},`,
      '',
      `O teu pagamento foi confirmado e o teu bilhete para o ${EVENT_INFO.name} está ativo.`,
      '',
      `Bilhete: ${r.ticketType.name} × ${r.quantity}`,
      `Quando: ${daysLabel(this.eventDays)}, ${EVENT_INFO.timeLabel}`,
      `Onde: ${EVENT_INFO.venue}`,
      `Código do bilhete: ${r.qrCode}`,
      '',
      'Apresenta o QR code em anexo à entrada, no telemóvel ou impresso. O código cobre toda a reserva e dá uma entrada por dia do evento: depois de validado, não volta a dar entrada no mesmo dia.',
      '',
      `Dúvidas? Contacta a ${EVENT_INFO.orgName} pelo ${EVENT_INFO.orgPhone}.`,
    ].join('\n');
  }

  private html(r: TicketReservation) {
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
          <p style="margin:0 0 8px;color:#f5efe6;font-size:22px;font-weight:800;">Olá ${escapeHtml(firstName(r.fullName))}, o teu bilhete está ativo!</p>
          <p style="margin:0 0 20px;color:#c9c0b8;font-size:14px;line-height:1.5;">O teu pagamento foi confirmado. Apresenta este QR code à entrada, no telemóvel ou impresso.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #3a3431;border-bottom:1px solid #3a3431;margin-bottom:24px;">
            ${row('Bilhete', `${r.ticketType.name} × ${r.quantity}`)}
            ${row('Quando', `${daysLabel(this.eventDays)}, ${EVENT_INFO.timeLabel}`)}
            ${row('Onde', EVENT_INFO.venue)}
          </table>
          <div style="background:#ffffff;padding:16px;text-align:center;">
            <img src="cid:bilhete-qr" width="240" height="240" alt="QR code do bilhete" style="display:block;margin:0 auto;">
            <p style="margin:12px 0 0;color:#161616;font-size:11px;font-family:monospace;word-break:break-all;">${escapeHtml(r.qrCode ?? '')}</p>
          </div>
          <p style="margin:20px 0 0;color:#c9c0b8;font-size:13px;line-height:1.5;">O código cobre toda a reserva e dá <strong style="color:#f5efe6;">uma entrada por dia</strong> do evento: depois de validado, não volta a dar entrada no mesmo dia.</p>
          <p style="margin:16px 0 0;color:#9a918b;font-size:12px;line-height:1.5;">Dúvidas? Contacta a ${EVENT_INFO.orgName} pelo ${EVENT_INFO.orgPhone}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
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
