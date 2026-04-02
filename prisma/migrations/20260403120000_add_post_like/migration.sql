-- AlterTable
ALTER TABLE "Post" ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "userAccountId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_userAccountId_postId_key" ON "PostLike"("userAccountId", "postId");

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
