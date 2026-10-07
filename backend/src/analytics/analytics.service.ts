import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { metrics } from '@opentelemetry/api';
import { PrismaService } from '../prisma/prisma.service';
import { PageViewDto } from './dto/page-view.dto';
import { WebVitalDto } from './dto/web-vital.dto';
import {
  classifyDevice,
  classifySource,
  isBot,
  normalizePath,
} from './traffic';

const meter = metrics.getMeter('kwamikon-api');

const pageViews = meter.createCounter('kwamikon.page_views', {
  description: 'Páginas vistas no site público',
});

const visits = meter.createCounter('kwamikon.visits', {
  description:
    'Sessões iniciadas no site público, por origem, dispositivo e tipo de visitante',
});

// Limites em segundos: cobrem do "bom" (<2.5 s no LCP) ao "mau" (>4 s) do Core Web Vitals.
const webVitalDuration = meter.createHistogram('kwamikon.web_vital.duration', {
  description:
    'Core Web Vitals medidos nos browsers dos visitantes (LCP, INP, FCP, TTFB)',
  unit: 's',
  advice: {
    explicitBucketBoundaries: [
      0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 3, 4, 5, 8, 12,
    ],
  },
});

const webVitalCls = meter.createHistogram('kwamikon.web_vital.cls', {
  description: 'Cumulative Layout Shift medido nos browsers dos visitantes',
  advice: {
    explicitBucketBoundaries: [0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 1],
  },
});

@Injectable()
export class AnalyticsService {
  private readonly siteHost: string | null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    try {
      this.siteHost = new URL(
        config.get<string>('PUBLIC_SITE_URL', ''),
      ).hostname.replace(/^www\./, '');
    } catch {
      this.siteHost = null;
    }
  }

  async recordPageView(dto: PageViewDto, userAgent: string | undefined) {
    if (isBot(userAgent)) return;

    const path = normalizePath(dto.path);
    const device = classifyDevice(userAgent);
    const source = dto.entry
      ? classifySource(dto.referrer, dto.utmSource, this.siteHost)
      : null;

    pageViews.add(1, { path, device });
    if (source) {
      visits.add(1, {
        source,
        device,
        visitor_type: dto.newVisitor ? 'novo' : 'recorrente',
      });
    }

    await this.prisma.pageView.create({
      data: {
        visitorId: dto.visitorId,
        sessionId: dto.sessionId,
        path: dto.path.split(/[?#]/)[0],
        source,
        device,
      },
    });
  }

  recordWebVital(dto: WebVitalDto, userAgent: string | undefined) {
    if (isBot(userAgent)) return;

    const attributes = {
      path: normalizePath(dto.path),
      device: classifyDevice(userAgent),
    };
    if (dto.name === 'CLS') {
      webVitalCls.record(dto.value, attributes);
    } else {
      webVitalDuration.record(dto.value / 1000, {
        ...attributes,
        metric: dto.name,
      });
    }
  }
}
