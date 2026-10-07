import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { BusinessMetricsService } from './business-metrics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, BusinessMetricsService],
})
export class AnalyticsModule {}
