import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { VeroClient } from './vero.client';
import { AuthModule } from '../auth/auth.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [AuthModule, ReservationsModule, TournamentsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, VeroClient],
})
export class PaymentsModule {}
