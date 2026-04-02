-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "sharesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sharePostId" TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_sharePostId_fkey" FOREIGN KEY ("sharePostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
