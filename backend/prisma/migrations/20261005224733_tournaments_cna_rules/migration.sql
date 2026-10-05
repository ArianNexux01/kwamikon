-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "platform" TEXT,
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
INSERT INTO "new_Tournament" ("createdAt", "description", "entryFeeKz", "eventDay", "game", "id", "maxPlayers", "name", "platform", "registrationOpen", "sortOrder", "startTime", "updatedAt") SELECT "createdAt", "description", "entryFeeKz", "eventDay", "game", "id", "maxPlayers", "name", "platform", "registrationOpen", "sortOrder", "startTime", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_sortOrder_idx" ON "Tournament"("sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Dados do regulamento "Torneio CNA": EA SPORTS FC 26 (e não 27), inscrição de 5.000 Kz.
-- O regulamento não indica plataforma, dia, hora nem vagas: as vagas (32) continuam
-- provisórias e os torneios continuam fechados até o organizador os rever.
UPDATE "Tournament" SET
  "name" = 'Torneio EA SPORTS FC 26',
  "game" = 'EA SPORTS FC 26',
  "platform" = NULL,
  "description" = 'Uma competição para os amantes do futebol virtual. Cada participante entra para representar a sua equipa e lutar pelo título de campeão.',
  "entryFeeKz" = 5000,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '5d0c7e1a-6f2b-4c8e-9a3d-1b2c3d4e5f01';

UPDATE "Tournament" SET
  "platform" = NULL,
  "description" = 'Os participantes enfrentam-se em combates 1 contra 1, com os seus personagens favoritos, para avançar na competição.',
  "entryFeeKz" = 5000,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '5d0c7e1a-6f2b-4c8e-9a3d-1b2c3d4e5f02';
