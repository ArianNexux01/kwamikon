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
  /** Método final: na página de pagamento o cliente pode escolher outro. */
  method: VeroMethod;
  amountKz: number;
  description?: string;
  customerPhone?: string;
  /** Página de pagamento alojada pela Vero, para onde o cliente é redireccionado. */
  paymentUrl?: string;
  /** A API não devolve a entidade/referência: só aparecem na página de pagamento. */
  referenceEntity?: string | null;
  referenceNumber?: string | null;
  expiresAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface CreateVeroTransaction {
  /** Método sugerido; o final vem no webhook e no GET. */
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

  getTransaction(id: string) {
    return this.request<VeroTransaction>(
      `/api/transactions/${encodeURIComponent(id)}`,
      { method: 'GET' },
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
