/**
 * Traces OpenTelemetry do browser: carregamento da página (document-load) e pedidos
 * fetch à API. O cabeçalho traceparent segue nos pedidos à API, por isso cada clique
 * aparece no Grafana (Tempo) ligado ao trace correspondente do backend.
 *
 * Os spans vão para VITE_OTEL_TRACES_URL (por omissão /otel/v1/traces no build Docker),
 * que o nginx do frontend encaminha para o OpenTelemetry Collector.
 * Carregado com import() dinâmico em main.tsx, fora do bundle principal.
 */
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { API_URL } from './api';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function initTelemetry(tracesUrl: string) {
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'kwamikon-frontend',
      'deployment.environment.name': import.meta.env.MODE,
    }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: tracesUrl }))],
  });
  provider.register();

  const apiBase = new URL(API_URL, window.location.origin).href;

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        // Só a nossa API recebe o traceparent; serviços externos ficam de fora.
        propagateTraceHeaderCorsUrls: [new RegExp(`^${escapeRegExp(apiBase)}`)],
        // Os próprios envios de telemetria e analytics não geram traces.
        ignoreUrls: [/\/otel\//, /\/analytics\//],
        clearTimingResources: true,
      }),
    ],
  });
}
