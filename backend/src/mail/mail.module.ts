import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { TicketMailService } from './ticket-mail.service';

@Module({
  providers: [MailService, TicketMailService],
  exports: [TicketMailService],
})
export class MailModule {}
