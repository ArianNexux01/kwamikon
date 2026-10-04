-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "cancelReason" TEXT;

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "FaqItem_sortOrder_idx" ON "FaqItem"("sortOrder");

-- Perguntas iniciais (as que estavam fixas no site). Ficam aqui, e não no seed, para
-- que as que o organizador apagar no backoffice não voltem a aparecer a cada arranque.
INSERT INTO "FaqItem" ("id", "question", "answer", "sortOrder", "updatedAt") VALUES
('8c1f0a52-3b8e-4d6a-9f1e-0a1b2c3d4e01', 'O que é o Kwamikon Nexus?', 'É a edição 2026 do Kwamikon, o maior encontro de cultura pop de Angola: anime, gaming, cinema, banda desenhada e cosplay num só espaço. O nome "Nexus" marca a mudança de formato: o evento deixa de ser só um encontro temático e passa a ser o ponto onde todos esses universos se cruzam, com novo local e nova escala.', 1, CURRENT_TIMESTAMP),
('8c1f0a52-3b8e-4d6a-9f1e-0a1b2c3d4e02', 'Quando e onde é o evento?', 'Nos dias 31 de outubro e 1 de novembro de 2026, a partir das 10h, no Xyami Nova Vida.', 2, CURRENT_TIMESTAMP),
('8c1f0a52-3b8e-4d6a-9f1e-0a1b2c3d4e03', 'Como funciona a reserva de bilhete?', 'Na página de bilhetes escolhes o pacote, preenches os teus dados e pagas logo a seguir. Tens 5 minutos para concluir o pagamento: se não for confirmado nesse tempo, ou se falhar, o pedido é cancelado e podes fazer um novo. Assim que o pagamento é confirmado, o bilhete com QR code fica ativo e é enviado para o teu email.', 3, CURRENT_TIMESTAMP),
('8c1f0a52-3b8e-4d6a-9f1e-0a1b2c3d4e04', 'Posso pagar o bilhete online, no site?', 'Sim. Podes pagar por Multicaixa Express, confirmando o pedido na app com o teu PIN, ou por referência, no ATM ou no Internet Banking. A confirmação é automática.', 4, CURRENT_TIMESTAMP),
('8c1f0a52-3b8e-4d6a-9f1e-0a1b2c3d4e05', 'O que é a moldura "Eu vou"?', 'Uma funcionalidade para anunciares que vais ao Kwamikon Nexus: tiras ou carregas uma foto, o site sobrepõe automaticamente a moldura oficial do evento, e descarregas a imagem para partilhares nas redes com a hashtag #EUVOU. Tudo é processado no teu telemóvel ou computador, e a tua foto nunca é enviada para nenhum servidor.', 5, CURRENT_TIMESTAMP),
('8c1f0a52-3b8e-4d6a-9f1e-0a1b2c3d4e06', 'Posso entrar com o bilhete no telemóvel?', 'Sim. Depois da confirmação, o QR code do teu bilhete pode ser apresentado diretamente do telemóvel à entrada, sem precisares de o imprimir.', 6, CURRENT_TIMESTAMP),
('8c1f0a52-3b8e-4d6a-9f1e-0a1b2c3d4e07', 'O bilhete vale para os dois dias? Posso sair e voltar a entrar?', 'O bilhete é válido nos dois dias do evento, 31 de outubro e 1 de novembro, com uma entrada por dia. Depois de validado à porta, o QR code não volta a dar entrada nesse dia, por isso se saíres só voltas a entrar no dia seguinte. Fora destes dias o bilhete não é aceite.', 7, CURRENT_TIMESTAMP);
