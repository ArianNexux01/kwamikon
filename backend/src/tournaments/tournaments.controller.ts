import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TournamentsService } from './tournaments.service';
import { TournamentPaymentsService } from './tournament-payments.service';
import { TournamentDto } from './dto/tournament.dto';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateEntryPaymentDto } from './dto/create-entry-payment.dto';
import { UpdateEntryStatusDto } from './dto/update-entry-status.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Get()
  list() {
    return this.service.listPublic();
  }

  /** Declarada antes de ':id' para "admin" não ser lido como um id. */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  async admin() {
    return {
      eventDays: this.service.days,
      tournaments: await this.service.listAdmin(),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  create(@Body() dto: TournamentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TournamentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/entries')
  createEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEntryDto,
  ) {
    return this.service.createEntry(id, dto);
  }
}

@Controller('tournament-entries')
export class TournamentEntriesController {
  constructor(
    private readonly service: TournamentsService,
    private readonly payments: TournamentPaymentsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  list(@Query('tournamentId') tournamentId?: string) {
    return this.service.listEntries(tournamentId || undefined);
  }

  @Get('export.csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  async export(
    @Res() res: Response,
    @Query('tournamentId') tournamentId?: string,
  ) {
    const csv = await this.service.exportCsv(tournamentId || undefined);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="inscricoes-torneios-kwamikon.csv"',
    );
    res.send(csv);
  }

  /** Público: o id (UUID) só é conhecido de quem fez a inscrição. */
  @Get(':id/summary')
  summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.summary(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryStatusDto,
  ) {
    return this.service.updateEntryStatus(id, dto.status);
  }

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  sync(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.syncEntry(id);
  }
}

@Controller('tournament-payments')
export class TournamentPaymentsController {
  constructor(private readonly payments: TournamentPaymentsService) {}

  @Post()
  create(@Body() dto: CreateEntryPaymentDto) {
    return this.payments.create(dto);
  }

  /** successUrl/failureUrl enviados à Vero. O webhook é o dos bilhetes (/api/payments/webhook). */
  @Get('return/:entryId')
  async paymentReturn(@Param('entryId') entryId: string, @Res() res: Response) {
    res.redirect(302, await this.payments.acknowledge(entryId));
  }

  @Get(':id')
  status(@Param('id') id: string) {
    return this.payments.status(id);
  }
}
