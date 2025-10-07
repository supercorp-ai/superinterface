-- CreateEnum
CREATE TYPE "TruncationType" AS ENUM ('AUTO', 'LAST_MESSAGES', 'DISABLED');

-- AlterTable
ALTER TABLE "Assistant" ADD COLUMN     "truncationLastMessagesCount" INTEGER,
ADD COLUMN     "truncationType" "TruncationType" NOT NULL DEFAULT 'AUTO';
