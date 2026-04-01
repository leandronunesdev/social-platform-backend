import { prisma } from "../lib/prisma";

const create = async (data: { userAccountId: string; content: string }) => {
  return prisma.post.create({
    data: {
      userAccountId: data.userAccountId,
      content: data.content,
    },
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

const postRepository = {
  create,
  findManyByUserId,
};

export { postRepository };
