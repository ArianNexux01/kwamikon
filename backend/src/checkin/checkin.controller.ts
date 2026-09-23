import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CheckinDto } from './dto/checkin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZADOR', 'STAFF_PORTA')
export class CheckinController {
  constructor(private readonly service: CheckinService) {}

  @Post()
  validate(@Body() dto: CheckinDto) {
    return this.service.validate(dto.code.trim());
  }
}
