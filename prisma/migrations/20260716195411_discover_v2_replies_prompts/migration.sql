-- CreateTable
CREATE TABLE "ResearcherDatabase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "college" TEXT,
    "department" TEXT NOT NULL,
    "fieldOfResearch" TEXT,
    "researchSummary" TEXT,
    "email" TEXT,
    "facultyWebsite" TEXT,
    "verificationSources" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmailTemplate" ("body", "createdAt", "id", "isDefault", "name", "subject", "updatedAt", "userId") SELECT "body", "createdAt", "id", "isDefault", "name", "subject", "updatedAt", "userId" FROM "EmailTemplate";
DROP TABLE "EmailTemplate";
ALTER TABLE "new_EmailTemplate" RENAME TO "EmailTemplate";
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
INSERT INTO "new_Professor" ("createdAt", "department", "draftBody", "draftSubject", "email", "gmailMessageId", "id", "name", "notes", "researchArea", "school", "sentAt", "status", "updatedAt", "userId") SELECT "createdAt", "department", "draftBody", "draftSubject", "email", "gmailMessageId", "id", "name", "notes", "researchArea", "school", "sentAt", "status", "updatedAt", "userId" FROM "Professor";
DROP TABLE "Professor";
ALTER TABLE "new_Professor" RENAME TO "Professor";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "school" TEXT,
    "degreeLevel" TEXT,
    "areaOfStudy" TEXT,
    "bio" TEXT,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "sendCountDate" DATETIME,
    "promptGenCount" INTEGER NOT NULL DEFAULT 0,
    "promptGenCountDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("areaOfStudy", "bio", "createdAt", "degreeLevel", "email", "emailVerified", "id", "image", "name", "onboarded", "school", "sendCount", "sendCountDate", "updatedAt") SELECT "areaOfStudy", "bio", "createdAt", "degreeLevel", "email", "emailVerified", "id", "image", "name", "onboarded", "school", "sendCount", "sendCountDate", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ResearcherDatabase_university_department_idx" ON "ResearcherDatabase"("university", "department");
