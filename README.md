# Kwamikon Nexus 2026

Site oficial do Kwamikon Nexus 2026, construído a partir do briefing em
`kwamikon-nexus-briefing-site.md` e dos materiais de marca fornecidos pela
organização (`KWAMIKON - BANNER PRINCIPAL.png`, `KWAMIKON - PREÇOS.png`,
`KWAMIKONLOGO 2.png`, `KWAMIKONNEXUS@2x.png`, `MOLDURA KWAMIKON.png`).

Monorepo com duas aplicações independentes:

- `frontend/` — React + Vite + TypeScript + Tailwind CSS
- `backend/` — NestJS + Prisma + SQLite

## Como correr em desenvolvimento

### Backend

```bash
cd backend
npm install
npx prisma migrate dev   # cria a base de dados SQLite e aplica o schema
npx ts-node prisma/seed.ts   # cria os tipos de bilhete e utilizadores de backoffice
npm run start:dev
```

A API fica disponível em `http://localhost:3333/api`.

Utilizadores de backoffice criados pelo seed (mudar a password em produção,
ver `SEED_ORG_PASSWORD` / `SEED_STAFF_PASSWORD` em `.env`):

- Organizador — `organizacao@kwamikon.ao` / `nexus2026admin`
- Staff de porta — `porta@kwamikon.ao` / `nexus2026porta`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O site fica disponível em `http://localhost:5173` (ou na porta seguinte livre).
O backoffice está em `/backoffice/login` — não está listado na navegação
pública, como pedido no briefing.

## O que já está implementado

- Home, Sobre, Programação (exemplo de estrutura), Bilhetes, Eu Vou, FAQ e
  Contacto, com identidade visual baseada na paleta e no grafismo reais da
  marca (máscara, grão, cortes assimétricos).
- Home com contagem decrescente até ao evento, faixa de estatísticas,
  galeria de peças oficiais da marca ("Momentos Nexus") e cartões de
  bilhete clicáveis que abrem um modal de reserva rápida sem sair da
  página (mesmo componente visual usado na página `/bilhetes`).
- Reserva de bilhetes com pagamento integrado na Vero Pays: cria a reserva
  com estado "pendente", valida duplicados pelo contacto (normalizado, tal
  como foi feito para o problema equivalente no formulário do INAPEM) e
  permite pagar logo por Multicaixa Express (GPO) ou por referência ATM
  (REF). Ver a secção "Pagamentos" abaixo.
- Funcionalidade "Eu vou": captura de foto por câmara ou upload, composição
  com a moldura oficial (`MOLDURA KWAMIKON.png`) feita inteiramente em
  canvas no browser, exportação em quadrado (feed) e vertical (stories).
- Backoffice com dois perfis (organizador / staff de porta): listagem e
  filtros de reservas, confirmação/cancelamento, geração de QR code ao
  confirmar, exportação CSV, métricas simples, e ecrã de check-in por QR
  code com fila de sincronização offline (guardada em `localStorage` e
  reenviada quando a ligação volta).

## Informação que a organização ainda precisa de confirmar

A imagem `KWAMIKON - PREÇOS.png` já deu resposta a grande parte da secção 10
do briefing (datas, local, tipos de bilhete e preços, contacto). Falta ainda:

- **API Key e Webhook Secret da Vero Pays** do projecto Kwamikon (ver
  secção "Pagamentos").
- **Programação detalhada** — a página `/programacao` mostra uma grelha de
  exemplo claramente identificada como tal (`src/pages/Programacao.tsx`).
- **Ficheiros de marca em vetor** e a fonte exata usada no texto corrido —
  o site usa Sora (Google Fonts) como alternativa, conforme sugerido no
  briefing, e os PNGs fornecidos foram usados diretamente (com alfa
  transparente, cores reais extraídas: magenta `#FF004E`, amarelo
  `#FFD527`, preto `#161616`).
- **Fotografias reais de edições anteriores**, se existirem — o site não
  usa fotografia de stock; a composição visual assenta apenas nos
  grafismos oficiais fornecidos.
- **Redes sociais oficiais** — os links de redes sociais na página de
  Contacto ainda não estão preenchidos.

## Notas técnicas

- Base de dados SQLite local (`backend/prisma/dev.db`, ignorada pelo git) —
  suficiente para o volume esperado deste evento; migrar para Postgres é
  uma alteração isolada ao `datasource` do `schema.prisma` se o alojamento
  final o exigir.
- Autenticação do backoffice por JWT (sem cookies), com guardas de rota por
  perfil (`ORGANIZADOR` vs `STAFF_PORTA`).
- O check-in por QR code é feito por token único gerado no servidor no
  momento da confirmação — nunca pelo cliente — para evitar duplicação,
  seguindo a mesma lógica de identificador único pedida no briefing.

## Pagamentos (Vero Pays)

A integração segue a documentação em https://eterim.vero.ao/app/docs (o
ficheiro `vero-payment.md` corresponde a uma versão antiga da API) e vive em
`backend/src/payments/`. A API Key nunca sai do backend.

Configuração em `backend/.env`:

```bash
VERO_API_URL="https://pays.vero.ao"
VERO_API_KEY="epk_..."          # API Key do projecto
VERO_WEBHOOK_SECRET="whsec_..." # Webhook Secret do projecto
PUBLIC_SITE_URL="https://..."   # URL público do site (página de sucesso e checkout)
PUBLIC_API_URL="https://..."    # URL público desta API (regresso da página de pagamento)

# Envio do bilhete por email; sem SMTP_HOST os emails não saem (ficam só no log)
SMTP_HOST="smtp.exemplo.com"
SMTP_PORT=587                   # 465 usa TLS directo; SMTP_SECURE força o modo
SMTP_USER="..."
SMTP_PASS="..."
MAIL_FROM="Kwamikon Nexus <bilhetes@kwamikon.ao>"
```

No dashboard Vero, o URL de webhook do projecto deve apontar para
`https://<dominio-da-api>/api/payments/webhook`.

Fluxo:

1. O visitante submete a reserva (`POST /api/reservations`), indica o
   telemóvel e o método preferido. O backend cria a transação
   (`POST /api/payments`) e guarda logo o id devolvido na tabela `Payment`.
2. O site redirecciona o visitante para o `paymentUrl`, a página de pagamento
   da Vero. É lá que ele aprova o Multicaixa Express ou vê a entidade e a
   referência, que a API não devolve.
3. No fim, a Vero devolve-o ao endpoint de acknowledge
   `GET /api/payments/return/:reservationId` (o `successUrl` e o `failureUrl`
   enviados na criação). O endpoint consulta a Vero
   (`GET /api/transactions/:id`), aplica o estado e redirecciona:
   para `/bilhetes/sucesso?reserva=...` se estiver pago ou ainda pendente, ou
   para `/bilhetes?pagamento=falhou` se falhou. A página de sucesso só mostra
   o bilhete e o QR code quando a reserva está confirmada; enquanto estiver
   pendente vai consultando `GET /api/payments/reservation/:id/ticket`, que
   pergunta à Vero no máximo uma vez a cada 4 segundos.
4. O webhook valida a assinatura `X-Eterim-Signature` (HMAC-SHA256 do corpo
   cru), volta a confirmar o estado com `GET /api/transactions/:id` e só
   então passa a reserva a `CONFIRMADO` e gera o QR code. O processamento é
   idempotente. Uma transação `expired` que passe mais tarde a `paid`
   confirma a reserva na mesma.
5. No backoffice, a coluna "Pagamento" mostra o estado da última cobrança e
   o botão "Verificar pagamento" consulta de novo as pendentes e expiradas.
6. Quando a reserva fica confirmada, seja pelo acknowledge, pelo webhook ou
   à mão no backoffice, o bilhete com o QR code é enviado para o email da
   reserva. O envio acontece uma única vez (`ticketEmailSentAt`), mesmo que
   a confirmação chegue por vários caminhos ao mesmo tempo. No backoffice, o
   botão "Reenviar bilhete" volta a enviá-lo.

Se o visitante pedir o pagamento outra vez com o mesmo telemóvel enquanto
uma cobrança está pendente, recebe a mesma página de pagamento em vez de uma
cobrança nova.

Em ambiente de testes da Vero, o telemóvel introduzido na página de pagamento
decide o resultado: `900000000` paga, `900003000` cancela, `900002004`
expira e qualquer outro `9xxxxxxxx` falha.

## Validade dos bilhetes e check-in

Os bilhetes dão entrada apenas nos dias do evento, 31 de outubro e 1 de
novembro de 2026, com uma entrada por dia. Os dias estão em `EVENT_DAYS` no
`backend/.env` e contam-se sempre na hora de Luanda.

Cada entrada fica na tabela `CheckIn`, com restrição única por reserva e dia.
Se dois telemóveis da porta lerem o mesmo QR code ao mesmo tempo, só um valida.
Uma reserva continua `CONFIRMADO` depois da entrada no primeiro dia e só passa
a `UTILIZADO` quando já entrou em todos os dias. A partir da primeira entrada,
já não pode ser cancelada.

Na fila offline do ecrã de check-in, cada leitura guarda a hora em que foi
feita. Uma leitura às 23h50 de dia 31 que só sincroniza no dia seguinte conta
para dia 31. O servidor ignora horas com mais de 36 horas ou no futuro.
