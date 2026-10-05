import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';

@Module({
  imports: [AuthModule],
  controllers: [ProgramController],
  providers: [ProgramService],
})
export class ProgramModule {}
