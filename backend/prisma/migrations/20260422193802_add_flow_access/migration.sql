-- CreateEnum
CREATE TYPE "FlowAccessRole" AS ENUM ('viewer', 'editor');

-- CreateTable
CREATE TABLE "FlowAccess" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FlowAccessRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowAccess_flowId_idx" ON "FlowAccess"("flowId");

-- CreateIndex
CREATE INDEX "FlowAccess_userId_idx" ON "FlowAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowAccess_flowId_userId_key" ON "FlowAccess"("flowId", "userId");

-- CreateIndex
CREATE INDEX "Flow_visibility_idx" ON "Flow"("visibility");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "FlowAccess" ADD CONSTRAINT "FlowAccess_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowAccess" ADD CONSTRAINT "FlowAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
