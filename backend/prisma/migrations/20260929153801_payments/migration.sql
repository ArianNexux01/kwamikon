-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountKz" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerPhone" TEXT,
    "referenceEntity" TEXT,
    "referenceNumber" TEXT,
    "expiresAt" DATETIME,
    "paidAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Payment_reservationId_idx" ON "Payment"("reservationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
