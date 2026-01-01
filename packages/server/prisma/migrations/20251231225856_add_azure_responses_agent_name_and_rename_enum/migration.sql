/*
  Warnings:

  - The values [AZURE_OPENAI_RESPONSES] on the enum `StorageProviderType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StorageProviderType_new" AS ENUM ('OPENAI', 'AZURE_OPENAI', 'SUPERINTERFACE_CLOUD', 'OPENAI_RESPONSES', 'AZURE_RESPONSES', 'AZURE_AGENTS');
ALTER TABLE "public"."Assistant" ALTER COLUMN "storageProviderType" DROP DEFAULT;
ALTER TABLE "Assistant" ALTER COLUMN "storageProviderType" TYPE "StorageProviderType_new" USING ("storageProviderType"::text::"StorageProviderType_new");
ALTER TYPE "StorageProviderType" RENAME TO "StorageProviderType_old";
ALTER TYPE "StorageProviderType_new" RENAME TO "StorageProviderType";
DROP TYPE "public"."StorageProviderType_old";
ALTER TABLE "Assistant" ALTER COLUMN "storageProviderType" SET DEFAULT 'OPENAI';
COMMIT;

-- AlterTable
ALTER TABLE "Assistant" ADD COLUMN     "azureResponsesAgentName" TEXT;
