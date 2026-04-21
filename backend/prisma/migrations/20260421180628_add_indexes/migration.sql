-- CreateIndex
CREATE INDEX "Flow_ownerId_idx" ON "Flow"("ownerId");

-- CreateIndex
CREATE INDEX "FlowSession_flowId_status_idx" ON "FlowSession"("flowId", "status");
