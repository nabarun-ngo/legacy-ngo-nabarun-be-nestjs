/*
  Warnings:

  - You are about to drop the `activity_expenses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `goals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `milestones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_risks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_team_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "activity_expenses" DROP CONSTRAINT "activity_expenses_activityId_fkey";

-- DropForeignKey
ALTER TABLE "activity_expenses" DROP CONSTRAINT "activity_expenses_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "activity_expenses" DROP CONSTRAINT "activity_expenses_userProfileId_fkey";

-- DropForeignKey
ALTER TABLE "donations" DROP CONSTRAINT "donations_donorId_fkey";

-- DropForeignKey
ALTER TABLE "goals" DROP CONSTRAINT "goals_projectId_fkey";

-- DropForeignKey
ALTER TABLE "milestones" DROP CONSTRAINT "milestones_projectId_fkey";

-- DropForeignKey
ALTER TABLE "notices" DROP CONSTRAINT "notices_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "project_risks" DROP CONSTRAINT "project_risks_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "project_risks" DROP CONSTRAINT "project_risks_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_team_members" DROP CONSTRAINT "project_team_members_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_team_members" DROP CONSTRAINT "project_team_members_userId_fkey";

-- DropTable
DROP TABLE "activity_expenses";

-- DropTable
DROP TABLE "goals";

-- DropTable
DROP TABLE "milestones";

-- DropTable
DROP TABLE "notices";

-- DropTable
DROP TABLE "project_risks";

-- DropTable
DROP TABLE "project_team_members";

-- CreateTable
CREATE TABLE "donors" (
    "id" TEXT NOT NULL,
    "donorType" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100),
    "phoneNumber" VARCHAR(20),
    "panNumber" VARCHAR(20),
    "address" TEXT,
    "userId" VARCHAR(255),
    "referenceMemberId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donors_email_idx" ON "donors"("email");

-- CreateIndex
CREATE INDEX "donors_phoneNumber_idx" ON "donors"("phoneNumber");

-- CreateIndex
CREATE INDEX "donors_userId_idx" ON "donors"("userId");

-- CreateIndex
CREATE INDEX "donors_referenceMemberId_idx" ON "donors"("referenceMemberId");

-- Migrate Members to Donors
INSERT INTO "donors" ("id", "donorType", "name", "email", "userId", "updatedAt")
SELECT "id", 'MEMBER', CONCAT_WS(' ', "firstName", "lastName"), "email", "id", NOW()
FROM "user_profiles";

-- Migrate Guests to Donors
INSERT INTO "donors" ("id", "donorType", "name", "email", "phoneNumber", "updatedAt")
SELECT gen_random_uuid(), 'GUEST', "donorName", "donorEmail", "donorPhone", NOW()
FROM "donations"
WHERE "donorId" IS NULL AND "donorName" IS NOT NULL
GROUP BY "donorName", "donorEmail", "donorPhone";

-- Update Guest Donations to point to new Donor Records
UPDATE "donations" d
SET "donorId" = (
  SELECT id FROM "donors" dn
  WHERE dn."donorType" = 'GUEST'
    AND dn."name" = d."donorName"
    AND (dn."email" = d."donorEmail" OR (dn."email" IS NULL AND d."donorEmail" IS NULL))
    AND (dn."phoneNumber" = d."donorPhone" OR (dn."phoneNumber" IS NULL AND d."donorPhone" IS NULL))
  LIMIT 1
)
WHERE d."donorId" IS NULL AND d."donorName" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donors" ADD CONSTRAINT "donors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donors" ADD CONSTRAINT "donors_referenceMemberId_fkey" FOREIGN KEY ("referenceMemberId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
