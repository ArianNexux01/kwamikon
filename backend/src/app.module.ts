import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TicketTypesModule } from './ticket-types/ticket-types.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CheckinModule } from './checkin/checkin.module';
import { PaymentsModule } from './payments/payments.module';
import { GalleryModule } from './gallery/gallery.module';
import { FaqModule } from './faq/faq.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { ProgramModule } from './program/program.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TicketTypesModule,
    ReservationsModule,
    CheckinModule,
    PaymentsModule,
    GalleryModule,
    FaqModule,
    TournamentsModule,
    ProgramModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
