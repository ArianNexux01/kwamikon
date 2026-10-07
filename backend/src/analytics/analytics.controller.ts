import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PageViewDto } from './dto/page-view.dto';
import { WebVitalDto } from './dto/web-vital.dto';

/** Recebe os eventos anónimos do site público (ver frontend/src/lib/analytics.ts). */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('pageview')
  @HttpCode(204)
  async pageView(
    @Body() dto: PageViewDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.service.recordPageView(dto, userAgent);
  }

  @Post('web-vitals')
  @HttpCode(204)
  webVital(
    @Body() dto: WebVitalDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    this.service.recordWebVital(dto, userAgent);
  }
}
