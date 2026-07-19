-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "aiDraftCount" INTEGER NOT NULL DEFAULT 0,
    "aiDraftCountDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("areaOfStudy", "bio", "createdAt", "degreeLevel", "email", "emailVerified", "id", "image", "name", "onboarded", "promptGenCount", "promptGenCountDate", "school", "sendCount", "sendCountDate", "updatedAt") SELECT "areaOfStudy", "bio", "createdAt", "degreeLevel", "email", "emailVerified", "id", "image", "name", "onboarded", "promptGenCount", "promptGenCountDate", "school", "sendCount", "sendCountDate", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
