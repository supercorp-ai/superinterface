-- CreateTable
CREATE TABLE "AzureAgentsFunctionOutput" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "runId" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AzureAgentsFunctionOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AzureAgentsFunctionOutput_runId_idx" ON "AzureAgentsFunctionOutput"("runId");

-- CreateIndex
CREATE INDEX "AzureAgentsFunctionOutput_createdAt_idx" ON "AzureAgentsFunctionOutput"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AzureAgentsFunctionOutput_runId_toolCallId_key" ON "AzureAgentsFunctionOutput"("runId", "toolCallId");
