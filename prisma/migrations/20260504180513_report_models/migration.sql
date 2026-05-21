-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reportCode" VARCHAR(50) NOT NULL,
    "requestedById" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL,
    "parameters" JSONB,
    "needApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" VARCHAR(255),
    "approvedAt" TIMESTAMP(3),
    "approvers" VARCHAR(255)[],
    "viewers" VARCHAR(255)[],
    "docId" VARCHAR(255),
    "docVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_reportCode_idx" ON "reports"("reportCode");

-- CreateIndex
CREATE INDEX "reports_requestedById_idx" ON "reports"("requestedById");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
