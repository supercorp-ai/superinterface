-- AlterTable
ALTER TABLE "Assistant" ADD COLUMN     "azureAgentsAgentId" TEXT;

-- AlterTable
ALTER TABLE "ModelProvider" ADD COLUMN     "azureClientId" TEXT,
ADD COLUMN     "azureClientSecret" TEXT,
ADD COLUMN     "azureTenantId" TEXT;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "azureAgentsThreadId" TEXT;
