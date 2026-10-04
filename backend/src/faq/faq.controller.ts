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
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FaqItemDto } from './dto/faq-item.dto';
import { ReorderFaqDto } from './dto/reorder-faq.dto';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  create(@Body() dto: FaqItemDto) {
    return this.service.create(dto);
  }

  /** Declarada antes de ':id' para "order" não ser lido como um id. */
  @Put('order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  reorder(@Body() dto: ReorderFaqDto) {
    return this.service.reorder(dto.ids);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FaqItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZADOR')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
