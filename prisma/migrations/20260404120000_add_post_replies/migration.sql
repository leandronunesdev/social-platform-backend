-- AlterTable
ALTER TABLE "Post" ADD COLUMN "repliesCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "replyPostId" TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_replyPostId_fkey" FOREIGN KEY ("replyPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
