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

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
