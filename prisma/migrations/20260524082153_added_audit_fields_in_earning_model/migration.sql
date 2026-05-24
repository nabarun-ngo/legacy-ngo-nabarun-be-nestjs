-- AlterTable
ALTER TABLE "earnings" ADD COLUMN     "createdById" VARCHAR(255),
ADD COLUMN     "receivedById" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
