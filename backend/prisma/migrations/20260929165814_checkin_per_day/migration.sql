-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "eventDay" TEXT NOT NULL,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckIn_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CheckIn_eventDay_idx" ON "CheckIn"("eventDay");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_reservationId_eventDay_key" ON "CheckIn"("reservationId", "eventDay");

-- Backfill: reservas já marcadas como UTILIZADO passam a ter a sua entrada na
-- tabela CheckIn (dia calculado no fuso de Luanda, UTC+1) e voltam a CONFIRMADO,
-- porque com vários dias de evento uma entrada deixa de esgotar o bilhete.
-- O Prisma guarda DateTime em SQLite como milissegundos; o texto cobre valores antigos.
INSERT INTO "CheckIn" ("id", "reservationId", "eventDay", "checkedInAt")
SELECT
    lower(hex(randomblob(16))),
    "id",
    CASE typeof("checkedInAt")
        WHEN 'integer' THEN date("checkedInAt" / 1000, 'unixepoch', '+1 hour')
        ELSE date("checkedInAt", '+1 hour')
    END,
    "checkedInAt"
FROM "Reservation"
WHERE "status" = 'UTILIZADO' AND "checkedInAt" IS NOT NULL;

UPDATE "Reservation" SET "status" = 'CONFIRMADO' WHERE "status" = 'UTILIZADO';
