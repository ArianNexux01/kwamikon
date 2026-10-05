-- CreateTable
CREATE TABLE "ProgramItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventDay" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "title" TEXT NOT NULL,
    "zone" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ProgramItem_eventDay_startTime_idx" ON "ProgramItem"("eventDay", "startTime");
