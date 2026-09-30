Documentação da API
Integra pagamentos nos teus projectos em minutos


Base URL
https://pays.vero.ao
Todos os endpoints são relativos a este URL. Respostas e pedidos em JSON.

Autenticação
Cada projecto tem uma API Key própria gerada no dashboard (formato epk_...). Inclui-a em todos os pedidos no header x-api-key.

curl https://pays.vero.ao/api/transactions \
  -H "Authorization: Bearer epk_SUA_CHAVE_AQUI"
Nunca exponhas a API Key no frontend / código cliente. Usa sempre no backend.
Endpoints
POST
/api/transactions
Criar transação
GET
/api/transactions/:id
Consultar transação
POST
/api/transactions/:id/sync
Forçar verificação na Pay4All
GET
/api/transactions
Listar transações do projecto
Criar Transação
Suporta dois métodos de pagamento: GPO (Multicaixa Express — push para o telemóvel) e REF (Referência ATM/Internet Banking).

JavaScript
TypeScript
Python
const API_URL = 'https://pays.vero.ao'
const API_KEY = 'epk_...' // A tua API Key do projecto

interface TransactionGPO {
  method: 'GPO'
  amount: number
  description: string
  customer: { phone: string; name?: string; email?: string }
}

interface TransactionREF {
  method: 'REF'
  amount: number
  description: string
  customer?: { name?: string; phone?: string; email?: string }
}

interface TransactionResponse {
  id: string
  status: 'pending' | 'paid' | 'expired' | 'failed'
  method: 'GPO' | 'REF'
  amountKz: number
  referenceEntity?: string
  referenceNumber?: string
  expiresAt?: string
  createdAt: string
}

async function criarTransacao(body: TransactionGPO | TransactionREF): Promise<TransactionResponse> {
  const res = await fetch(`${API_URL}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

// Uso:
const transacao = await criarTransacao({
  method: 'REF',
  amount: 5000,
  description: 'Subscrição mensal — Vero Pro',
})
Resposta — REF

{
  "id": "663b098b-9704-4502-8c2a-104987a44df8",
  "projectId": "779b90ce-94be-4888-a451-70e64948b457",
  "status": "pending",
  "method": "REF",
  "amountKz": 5000,
  "description": "Subscrição mensal — Vero Pro",
  "referenceEntity": "10111",
  "referenceNumber": "547915507",
  "merchantTransactionId": "663B098B9704450",
  "expiresAt": "2026-07-01T20:20:27.528Z",
  "createdAt": "2026-06-28T20:20:26.800Z"
}
Resposta — GPO

{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "projectId": "779b90ce-94be-4888-a451-70e64948b457",
  "status": "pending",
  "method": "GPO",
  "amountKz": 5000,
  "description": "Subscrição mensal — Lumi Premium",
  "customerPhone": "923456789",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
A confirmação com a rede pode demorar mais que o normal (sobretudo no GPO, à espera do Multicaixa Express). Nesses casos a API não falha o pedido — responde 201 na mesma, com status: "pending" e o id da transação, mesmo sem confirmação imediata da Pay4All.

Guarda sempre o id devolvido, mesmo quando o pedido demorou — é ele que vai permitir associar o webhook de confirmação mais tarde. Já aconteceu num projecto integrado o cliente pagar (a notificação chegou ao telemóvel) e o pagamento não aparecer como confirmado na plataforma — porque o id nunca tinha sido guardado do lado do projecto. Não assumas que o pagamento falhou só porque a resposta demorou: confia sempre no webhook transaction.paid ou num GET /:id posterior para o estado final.

Consultar Estado
Após criar uma cobrança, podes consultar o estado a qualquer momento com GET /:id. Se precisares de certeza imediata (ex: ecrã "à espera do pagamento" a fazer polling), usa POST /:id/sync — vai perguntar o estado real à Pay4All na hora, actualiza e devolve a transação já actualizada.

// Consultar o estado guardado
const res = await fetch(`https://pays.vero.ao/api/transactions/${transactionId}`, {
  headers: { 'Authorization': `Bearer ${API_KEY}` },
})
const transaction = await res.json()
// transaction.status → 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled'

// Forçar verificação imediata junto da Pay4All (útil no ecrã "à espera")
const sync = await fetch(`https://pays.vero.ao/api/transactions/${transactionId}/sync`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
})
const atualizada = await sync.json() // já com o estado mais recente
pending
Aguarda pagamento

paid
Pago e confirmado

expired
Prazo expirado

failed
Falha no pagamento

Webhooks
Sempre que uma transação atinge um estado final, o Eterim Pays chama o URL de webhook do teu projecto automaticamente. Configura o URL nas definições do projecto no dashboard.

Eventos

transaction.paid
paidPagamento confirmado

transaction.failed
failedPagamento falhou

transaction.expired
expiredReferência expirou

transaction.cancelled
cancelledCancelada

Payload recebido

{
  "event": "transaction.paid",
  "transaction_id": "663b098b-9704-4502-8c2a-104987a44df8",
  "project_id": "779b90ce-94be-4888-a451-70e64948b457",
  "method": "REF",
  "amount": 5000,
  "currency": "AOA",
  "status": "paid",
  "paid_at": "2026-07-04T08:10:51.000Z",
  "metadata": { "order_id": "ord_123" }
}
Headers

X-Eterim-Event
O mesmo valor de event
X-Eterim-Signature
sha256=<hmac> — HMAC-SHA256 do corpo cru, com o segredo partilhado
Exemplo de handler (com validação da assinatura)

import crypto from 'node:crypto'

// IMPORTANTE: valida a assinatura para garantir que o pedido veio mesmo
// do Eterim Pays. Precisas do corpo CRU (raw) para o cálculo do HMAC.
app.post('/webhook/pagamentos',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // 1. Valida a assinatura HMAC-SHA256 do corpo recebido
    const esperado = 'sha256=' + crypto
      .createHmac('sha256', process.env.ETERIM_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex')

    const assinatura = req.get('X-Eterim-Signature') ?? ''
    if (assinatura.length !== esperado.length ||
        !crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado))) {
      return res.sendStatus(401) // assinatura inválida — ignora
    }

    // 2. Processa o evento (idempotente: pode chegar mais que uma vez)
    const payload = JSON.parse(req.body.toString())
    if (payload.event === 'transaction.paid') {
      await marcarComoPago(payload.transaction_id, payload.amount)
    }

    res.json({ received: true }) // responde 2xx em menos de 10s
  }
)
Valida sempre a assinatura X-Eterim-Signature — senão qualquer um pode forjar um pagamento. Cada projecto tem o seu próprio Webhook Secret, visível no dashboard em Projectos → expandir o projecto → "Webhook Secret".

Idempotência: o mesmo transaction_id pode chegar mais que uma vez (retry + reconciliação). Processa uma única vez.

REF é assíncrono: o cliente paga a referência mais tarde (ATM/app), sem sessão aberta. Marca a encomenda como pendente e cumpre-a quando receberes o webhook transaction.paid.

Rede de segurança: mesmo que o webhook falhe, o estado reconcilia automaticamente em poucos minutos. Para confirmação crítica, confirma sempre com GET /:id antes de entregar valor.

Retries: 3 tentativas com intervalo crescente se não responderes com 2xx. Timeout: 10s por tentativa.

Exemplos por Projecto
V
Vero
Subscrições mensais
// Quando o utilizador clica em "Subscrever"
const transacao = await criarTransacao({
  method: 'REF',
  amount: 2500,
  description: 'Vero Pro — Junho 2026',
  customer: { name: user.name },
})

// Guarda o ID para verificar depois
await db.subscriptions.update({
  where: { userId: user.id },
  data: { transactionId: transacao.id, status: 'pending' },
})

// Mostra os dados de pagamento ao utilizador
return {
  entity: transacao.referenceEntity,
  reference: transacao.referenceNumber,
  expires: transacao.expiresAt,
}
L
Lumi
Pagamento imediato por GPO
// Checkout rápido via Multicaixa Express
const transacao = await criarTransacao({
  method: 'GPO',
  amount: order.total,
  description: `Pedido #${order.id} — Lumi`,
  customer: {
    phone: user.phone, // ex: '923456789' — obrigatório para GPO
    name: user.name,
  },
})

// O cliente recebe notificação push na app Multicaixa Express
// e confirma o pagamento com o PIN

// Guarda o transactionId e aguarda o webhook para confirmar
await db.orders.update({
  where: { id: order.id },
  data: { transactionId: transacao.id, status: 'awaiting_payment' },
})
F
Fupa
Compra de créditos / pacotes
// Utilizador compra pacote de créditos
const pacotes = { basic: 1000, pro: 3500, ultra: 8000 }

const transacao = await criarTransacao({
  method: 'REF', // ou 'GPO' se o utilizador preferir
  amount: pacotes[plano],
  description: `Fupa ${plano} — ${creditos} créditos`,
  customer: { name: user.name },
})

// Handler do webhook — activa os créditos quando pago
// POST /webhook/fupa/pagamentos
if (payload.event === 'transaction.paid') {
  const tx = await db.transactions.findById(payload.transaction_id)
  await adicionarCreditos(tx.userId, tx.creditos)
}
Erros
Todos os erros retornam JSON com statusCode, error e message.

{
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "message": "API Key inválida ou em falta"
}
400
BAD_REQUEST
Dados inválidos na requisição

401
UNAUTHORIZED
API Key em falta ou inválida

404
NOT_FOUND
Recurso não encontrado

429
TOO_MANY_REQUESTS
Limite de 200 req/min excedido

502
PAY4ALL_ERROR
Erro na comunicação com Pay4All

500
INTERNAL_ERROR
Erro interno do servidor

504
PAY4ALL_GET_CHARGE_TIMEOUT
Timeout a consultar a Pay4All via /sync — tenta de novo