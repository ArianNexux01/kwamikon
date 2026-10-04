import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type VeroMethod = 'GPO' | 'REF';
export type VeroStatus =
  'pending' | 'paid' | 'expired' | 'failed' | 'cancelled';

export interface VeroTransaction {
  id: string;
  status: VeroStatus;
  /** Escolhido por nós na criação; o cliente já não o pode trocar a meio. */
  method: VeroMethod;
  amountKz: number;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  provider?: string;
  /** Página de pagamento alojada pela Vero, para onde o cliente é redireccionado. */
  paymentUrl?: string;
  /** Checkout do gateway: nunca mandar o cliente para aqui, só para o paymentUrl. */
  checkoutUrl?: string | null;
  /**
   * "emis-gpo" ou "emis-reference" quando o pagamento já foi iniciado; null quando o
   * cliente tem de escolher o método no checkout do gateway (via paymentUrl).
   */
  wipayProcessor?: string | null;
  /** Em REF pode vir null nos primeiros segundos, enquanto a referência é gerada. */
  referenceEntity?: string | null;
  referenceNumber?: string | null;
  expiresAt?: string | null;
  paidAt?: string | null;
  metadata?: Record<string, string> | null;
  createdAt: string;
}

export interface CreateVeroTransaction {
  /** GPO envia logo o pedido para customer.phone; REF gera entidade e referência. */
  method: VeroMethod;
  /** Kwanzas, inteiro, mínimo 100. */
  amount: number;
  /** 3 a 200 caracteres; aparece na página de pagamento. */
  description: string;
  customer: { phone: string; name?: string; email?: string };
  successUrl?: string;
  failureUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Cliente mínimo da API Vero Pays (https://pays.vero.ao).
 * A API Key só existe no backend; nunca é enviada para o browser.
 */
@Injectable()
export class VeroClient {
  private readonly logger = new Logger(VeroClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config
      .get<string>('VERO_API_URL', 'https://pays.vero.ao')
      .replace(/\/$/, '');
    this.apiKey = config.get<string>('VERO_API_KEY', '');
  }

  createTransaction(body: CreateVeroTransaction) {
    return this.request<VeroTransaction>(
      '/api/transactions',
      { method: 'POST', body },
      30_000,
    );
  }

  /**
   * Numa transação pendente, cada consulta confirma o estado directamente no gateway.
   * O timeout fica abaixo dos 10 s que a Vero espera pela resposta ao webhook.
   */
  getTransaction(id: string) {
    return this.request<VeroTransaction>(
      `/api/transactions/${encodeURIComponent(id)}`,
      { method: 'GET' },
      8_000,
    );
  }

  private async request<T>(
    path: string,
    { method, body }: { method: 'GET' | 'POST'; body?: unknown },
    timeoutMs = 20_000,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'Pagamentos indisponíveis: VERO_API_KEY não configurada.',
      );
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          // A Vero rejeita Content-Type JSON sem corpo, por isso só o enviamos com corpo.
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      this.logger.error(
        `Falha de rede ao chamar Vero ${method} ${path}: ${(err as Error).message}`,
      );
      throw new BadGatewayException(
        'Não foi possível contactar o serviço de pagamentos. Tenta novamente.',
      );
    }

    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      this.logger.warn(
        `Vero ${method} ${path} respondeu ${res.status} ${data.error ?? ''}: ${data.message ?? ''}`,
      );
      if (res.status === 400) {
        throw new BadRequestException(
          data.message ?? 'Dados de pagamento inválidos.',
        );
      }
      if (data.error === 'WIPAY_NOT_CONFIGURED') {
        throw new HttpException(
          'Os pagamentos estão temporariamente indisponíveis. Tenta mais tarde.',
          503,
        );
      }
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        throw new HttpException(
          'O serviço de pagamentos está ocupado. Tenta novamente dentro de instantes.',
          503,
        );
      }
      throw new BadGatewayException(
        'O serviço de pagamentos devolveu um erro. Tenta novamente.',
      );
    }

    return data as T;
  }
}
