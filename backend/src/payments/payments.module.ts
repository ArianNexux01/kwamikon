import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { VeroClient } from './vero.client';
import { AuthModule } from '../auth/auth.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [AuthModule, ReservationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, VeroClient],
})
export class PaymentsModule {}
