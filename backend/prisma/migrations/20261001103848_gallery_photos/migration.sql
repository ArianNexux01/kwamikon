-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "GalleryPhoto_fileName_key" ON "GalleryPhoto"("fileName");

-- CreateIndex
CREATE INDEX "GalleryPhoto_sortOrder_idx" ON "GalleryPhoto"("sortOrder");
