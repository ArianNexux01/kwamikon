import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post()
  create(@Body() dto: CreateReservationDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR', 'STAFF_PORTA')
  findAll(@Query() filters: ListReservationsDto) {
    return this.service.findAll(filters);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  metrics() {
    return this.service.metrics();
  }

  @Get('export.csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  async export(@Res() res: Response) {
    const csv = await this.service.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservas-kwamikon.csv"');
    res.send(csv);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR', 'STAFF_PORTA')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/qrcode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  async qrCode(@Param('id') id: string) {
    const dataUrl = await this.service.qrCodeImage(id);
    return { dataUrl };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }
}
