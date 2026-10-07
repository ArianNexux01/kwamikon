/**
 * OpenTelemetry da API: traces (pedidos HTTP, Express, NestJS, Prisma) e métricas
 * (pedidos HTTP, runtime do Node, CPU/memória do processo e métricas de negócio).
 *
 * Tem de ser importado antes de qualquer outro módulo (ver main.ts) para que as
 * instrumentações consigam envolver http/express quando estes são carregados.
 *
 * Só fica activo quando OTEL_EXPORTER_OTLP_ENDPOINT está definido (ex.:
 * http://otel-collector:4318, ver docker-compose.observability.yml). Sem ele a API
 * corre exatamente como antes.
 */
import { metrics } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { PrismaInstrumentation } from '@prisma/instrumentation';

export const telemetryEnabled = Boolean(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
);

if (telemetryEnabled) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'kwamikon-api',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.1',
      'deployment.environment.name': process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
        exportIntervalMillis: Number(
          process.env.OTEL_METRIC_EXPORT_INTERVAL ?? 15000,
        ),
      }),
    ],
    instrumentations: [
      new HttpInstrumentation({
        // O healthcheck do Docker corre a cada 30 s e só enche os traces de ruído.
        ignoreIncomingRequestHook: (req) =>
          req.headers['user-agent']?.startsWith('Wget') ?? false,
      }),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      new RuntimeNodeInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();

  // CPU e memória do processo (o host e os containers vêm do node-exporter e do cAdvisor).
  new HostMetrics({
    meterProvider: metrics.getMeterProvider(),
    name: 'kwamikon-api-host-metrics',
    metricGroups: ['process.cpu', 'process.memory'],
  }).start();

  const shutdown = () => {
    sdk
      .shutdown()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
