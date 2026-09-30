import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

/**
 * Envio de email por SMTP. Sem SMTP_HOST configurado (ex.: em desenvolvimento)
 * os emails não saem: ficam registados no log e o envio conta como não feito.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT', '587'));
    const user = config.get<string>('SMTP_USER');

    this.from = config.get<string>(
      'MAIL_FROM',
      'Kwamikon Nexus <bilhetes@kwamikon.ao>',
    );
    this.transporter = host
      ? createTransport({
          host,
          port,
          // 465 usa TLS directo; nas outras portas o STARTTLS é negociado.
          secure:
            config.get<string>('SMTP_SECURE', String(port === 465)) === 'true',
          auth: user
            ? { user, pass: config.get<string>('SMTP_PASS', '') }
            : undefined,
        })
      : null;
  }

  async send(message: Omit<Mail.Options, 'from'>): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP não configurado: email "${String(message.subject)}" para ${String(message.to)} não foi enviado.`,
      );
      return false;
    }
    await this.transporter.sendMail({ ...message, from: this.from });
    return true;
  }
}
