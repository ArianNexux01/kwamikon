import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { TicketTypesService } from './ticket-types.service';
import { UpdateTicketPriceDto } from './dto/update-ticket-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ticket-types')
export class TicketTypesController {
  constructor(private readonly service: TicketTypesService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }

  /** Backoffice: inclui os tipos inactivos. */
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  updatePrice(@Param('id') id: string, @Body() dto: UpdateTicketPriceDto) {
    return this.service.updatePrice(id, dto.refPrice);
  }
}
