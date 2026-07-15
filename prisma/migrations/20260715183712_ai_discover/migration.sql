-- AlterTable
ALTER TABLE "User" ADD COLUMN "aiSearchAcknowledgedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Professor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "department" TEXT,
    "researchArea" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "draftSubject" TEXT,
    "draftBody" TEXT,
    "sentAt" DATETIME,
    "gmailMessageId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Professor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Professor" ("createdAt", "department", "draftBody", "draftSubject", "email", "gmailMessageId", "id", "name", "notes", "researchArea", "school", "sentAt", "status", "updatedAt", "userId") SELECT "createdAt", "department", "draftBody", "draftSubject", "email", "gmailMessageId", "id", "name", "notes", "researchArea", "school", "sentAt", "status", "updatedAt", "userId" FROM "Professor";
DROP TABLE "Professor";
ALTER TABLE "new_Professor" RENAME TO "Professor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
