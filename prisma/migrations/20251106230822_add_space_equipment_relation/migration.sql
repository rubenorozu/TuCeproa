-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "space_id" TEXT;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;
