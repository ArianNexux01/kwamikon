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
- Reserva de bilhetes sem pagamento integrado: cria a reserva com estado
  "pendente", valida duplicados pelo contacto (normalizado, tal como foi
  feito para o problema equivalente no formulário do INAPEM), e mostra
  instruções de pagamento manual.
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

- **Dados bancários / referência Multicaixa Express** para o pagamento
  manual — atualmente o site mostra um texto genérico a pedir para
  contactar a organização pelo telefone (`src/lib/site-content.ts`,
  constante `PAYMENT_INSTRUCTIONS_PLACEHOLDER`).
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
