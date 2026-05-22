-- AlterTable
ALTER TABLE "reports" ALTER COLUMN "approvers" SET DEFAULT ARRAY[]::VARCHAR(255)[],
ALTER COLUMN "viewers" SET DEFAULT ARRAY[]::VARCHAR(255)[];

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_forEventId_fkey" FOREIGN KEY ("forEventId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
