/*
  Warnings:

  - You are about to drop the column `replySeenAt` on the `Professor` table. All the data in the column will be lost.

*/
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
    "threadId" TEXT,
    "hasReply" BOOLEAN NOT NULL DEFAULT false,
    "replySnippet" TEXT,
    "repliedAt" DATETIME,
    "templateNameUsed" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "importedFromDbId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Professor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Professor" ("createdAt", "department", "draftBody", "draftSubject", "email", "gmailMessageId", "hasReply", "id", "importedFromDbId", "name", "notes", "repliedAt", "replySnippet", "researchArea", "school", "sentAt", "source", "status", "templateNameUsed", "threadId", "updatedAt", "userId") SELECT "createdAt", "department", "draftBody", "draftSubject", "email", "gmailMessageId", "hasReply", "id", "importedFromDbId", "name", "notes", "repliedAt", "replySnippet", "researchArea", "school", "sentAt", "source", "status", "templateNameUsed", "threadId", "updatedAt", "userId" FROM "Professor";
DROP TABLE "Professor";
ALTER TABLE "new_Professor" RENAME TO "Professor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
