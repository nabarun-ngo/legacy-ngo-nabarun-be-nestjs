/*
  Warnings:

  - You are about to drop the column `receivedDate` on the `earnings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "earnings" DROP COLUMN "receivedDate",
ALTER COLUMN "earningDate" DROP NOT NULL;
