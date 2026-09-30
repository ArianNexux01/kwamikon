import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.service.create(dto);
  }

  /** URL a configurar no dashboard Vero: https://<dominio>/api/payments/webhook */
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-eterim-signature') signature?: string,
  ) {
    return this.service.handleWebhook(req.rawBody, signature);
  }

  /**
   * successUrl/failureUrl enviados à Vero: faz o acknowledge do pagamento e
   * redirecciona o cliente para a página de sucesso ou de volta ao checkout.
   */
  @Get('return/:reservationId')
  async paymentReturn(
    @Param('reservationId') reservationId: string,
    @Res() res: Response,
  ) {
    res.redirect(302, await this.service.acknowledge(reservationId));
  }

  @Get('reservation/:reservationId/ticket')
  ticket(@Param('reservationId') reservationId: string) {
    return this.service.ticket(reservationId);
  }

  @Post('reservation/:reservationId/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  syncReservation(@Param('reservationId') reservationId: string) {
    return this.service.syncReservation(reservationId);
  }

  @Get(':id')
  status(@Param('id') id: string) {
    return this.service.status(id);
  }
}
