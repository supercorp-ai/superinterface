-- CreateEnum
CREATE TYPE "ImageGenerationToolBackground" AS ENUM ('AUTO', 'TRANSPARENT', 'OPAQUE');

-- AlterTable
ALTER TABLE "ImageGenerationTool" ADD COLUMN     "background" "ImageGenerationToolBackground" NOT NULL DEFAULT 'AUTO';
