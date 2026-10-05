-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "description" TEXT,
    "eventDay" TEXT,
    "startTime" TEXT,
    "entryFeeKz" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TournamentEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gamerTag" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "contactNorm" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "cancelReason" TEXT,
    "emailSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountKz" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerPhone" TEXT,
    "paymentUrl" TEXT,
    "referenceEntity" TEXT,
    "referenceNumber" TEXT,
    "expiresAt" DATETIME,
    "paidAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TournamentPayment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TournamentEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Tournament_sortOrder_idx" ON "Tournament"("sortOrder");

-- CreateIndex
CREATE INDEX "TournamentEntry_tournamentId_status_idx" ON "TournamentEntry"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "TournamentEntry_contactNorm_idx" ON "TournamentEntry"("contactNorm");

-- CreateIndex
CREATE INDEX "TournamentPayment_entryId_idx" ON "TournamentPayment"("entryId");

-- CreateIndex
CREATE INDEX "TournamentPayment_status_idx" ON "TournamentPayment"("status");

-- Torneios iniciais. Ficam fechados até o organizador confirmar a taxa, o dia, a hora e
-- as vagas no backoffice; estão aqui, e não no seed, para não voltarem se forem apagados.
INSERT INTO "Tournament" ("id", "name", "game", "platform", "entryFeeKz", "maxPlayers", "registrationOpen", "sortOrder", "updatedAt") VALUES
('5d0c7e1a-6f2b-4c8e-9a3d-1b2c3d4e5f01', 'Torneio EA SPORTS FC 27', 'EA SPORTS FC 27', 'PS5', 2000, 32, false, 1, CURRENT_TIMESTAMP),
('5d0c7e1a-6f2b-4c8e-9a3d-1b2c3d4e5f02', 'Torneio Mortal Kombat 11', 'Mortal Kombat 11', 'PS5', 2000, 32, false, 2, CURRENT_TIMESTAMP);
