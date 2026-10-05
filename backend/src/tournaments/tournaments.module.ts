import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { VeroClient } from '../payments/vero.client';
import {
  TournamentEntriesController,
  TournamentPaymentsController,
  TournamentsController,
} from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { TournamentPaymentsService } from './tournament-payments.service';
import { TournamentMailService } from './tournament-mail.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [
    TournamentsController,
    TournamentEntriesController,
    TournamentPaymentsController,
  ],
  providers: [
    TournamentsService,
    TournamentPaymentsService,
    TournamentMailService,
    VeroClient,
  ],
  exports: [TournamentPaymentsService],
})
export class TournamentsModule {}
