import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { trackWebVitals } from './lib/analytics'

const otelTracesUrl = import.meta.env.VITE_OTEL_TRACES_URL
if (otelTracesUrl) {
  import('./lib/telemetry').then(({ initTelemetry }) => initTelemetry(otelTracesUrl))
}
trackWebVitals()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
