-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "eventDate" DATETIME,
    "eventType" TEXT,
    "guestCount" INTEGER,
    "location" TEXT,
    "packageInterest" TEXT,
    "leadSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New Lead',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "firstContact" DATETIME,
    "lastOutreach" DATETIME,
    "lastClientReply" DATETIME,
    "outreachCount" INTEGER NOT NULL DEFAULT 0,
    "clientResponded" BOOLEAN NOT NULL DEFAULT false,
    "daysSilent" INTEGER NOT NULL DEFAULT 0,
    "quoteAmount" REAL,
    "depositAmount" REAL,
    "currentSituation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rawEmailId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT NOT NULL DEFAULT 'never',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "TimelineEvent_leadId_idx" ON "TimelineEvent"("leadId");
