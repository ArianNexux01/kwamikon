import { Controller, Get } from '@nestjs/common';
import { TicketTypesService } from './ticket-types.service';

@Controller('ticket-types')
export class TicketTypesController {
  constructor(private readonly service: TicketTypesService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }
}
