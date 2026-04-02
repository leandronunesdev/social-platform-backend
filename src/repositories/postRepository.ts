import { prisma } from "../lib/prisma";

const create = async (data: {
  userAccountId: string;
  content: string;
  sharePostId: string | null;
}) => {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        userAccountId: data.userAccountId,
        content: data.content,
        sharePostId: data.sharePostId,
      },
    });
    if (data.sharePostId) {
      const updated = await tx.post.updateMany({
        where: { id: data.sharePostId },
        data: { sharesCount: { increment: 1 } },
      });
      if (updated.count === 0) {
        throw new Error("SHARE_TARGET_NOT_FOUND");
      }
    }
    return post;
  });
};

const findById = async (id: string) => {
  return prisma.post.findUnique({
    where: { id },
  });
};

const update = async (params: { id: string; content: string }) => {
  return prisma.post.update({
    where: { id: params.id },
    data: { content: params.content },
  });
};

const findManyByUserId = async (params: {
  userAccountId: string;
  skip: number;
  take: number;
}) => {
  const where = { userAccountId: params.userAccountId };
  const [items, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.post.count({ where }),
  ]);
  return { items, total };
};

const findManyBySharePostId = async (params: {
  sharePostId: string;
  skip: number;
  take: number;
}) => {
  const where = { sharePostId: params.sharePostId };
  const [items, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.post.count({ where }),
  ]);
  return { items, total };
};

const postRepository = {
  create,
  findById,
  update,
  findManyByUserId,
  findManyBySharePostId,
};

export { postRepository };
