import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TicketTypesModule } from './ticket-types/ticket-types.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CheckinModule } from './checkin/checkin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TicketTypesModule,
    ReservationsModule,
    CheckinModule,
  ],
})
export class AppModule {}
