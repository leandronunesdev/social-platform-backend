import { prisma } from "../lib/prisma";

const create = async (data: {
  userAccountId: string;
  content: string;
  sharePostId: string | null;
}) => {
  return prisma.$transaction(async (tx) => {
    if (data.sharePostId) {
      const target = await tx.post.findUnique({
        where: { id: data.sharePostId },
        select: { id: true },
      });
      if (!target) {
        throw new Error("SHARE_TARGET_NOT_FOUND");
      }
    }
    const post = await tx.post.create({
      data: {
        userAccountId: data.userAccountId,
        content: data.content,
        sharePostId: data.sharePostId,
      },
    });
    if (data.sharePostId) {
      await tx.post.update({
        where: { id: data.sharePostId },
        data: { sharesCount: { increment: 1 } },
      });
    }
    return post;
  });
};

const findById = async (id: string) => {
  return prisma.post.findUnique({
    where: { id },
  });
};

const authorSelect = { id: true, name: true, username: true } as const;

const findByIdWithDetails = async (id: string) => {
  return prisma.post.findUnique({
    where: { id },
    include: {
      UserAccount: {
        select: authorSelect,
      },
      sharedFrom: {
        include: {
          UserAccount: {
            select: authorSelect,
          },
        },
      },
    },
  });
};

const hasViewerLikedPost = async (
  userAccountId: string,
  postId: string,
): Promise<boolean> => {
  const row = await prisma.postLike.findUnique({
    where: {
      userAccountId_postId: { userAccountId, postId },
    },
  });
  return row !== null;
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

const addLike = async (userAccountId: string, postId: string) => {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }
    const existing = await tx.postLike.findUnique({
      where: {
        userAccountId_postId: { userAccountId, postId },
      },
    });
    if (existing) {
      return { likesCount: post.likesCount };
    }
    await tx.postLike.create({
      data: { userAccountId, postId },
    });
    const updated = await tx.post.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    });
    return { likesCount: updated.likesCount };
  });
};

const removeLike = async (userAccountId: string, postId: string) => {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }
    const removed = await tx.postLike.deleteMany({
      where: { userAccountId, postId },
    });
    if (removed.count === 0) {
      return { likesCount: post.likesCount };
    }
    const nextCount = Math.max(0, post.likesCount - 1);
    const updated = await tx.post.update({
      where: { id: postId },
      data: { likesCount: nextCount },
    });
    return { likesCount: updated.likesCount };
  });
};

const findLikersByPostId = async (params: {
  postId: string;
  skip: number;
  take: number;
}) => {
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
  });
  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }
  const [rows, total] = await prisma.$transaction([
    prisma.postLike.findMany({
      where: { postId: params.postId },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: {
        UserAccount: {
          select: { id: true, name: true, username: true },
        },
      },
    }),
    prisma.postLike.count({ where: { postId: params.postId } }),
  ]);
  return { rows, total };
};

const postRepository = {
  create,
  findById,
  findByIdWithDetails,
  hasViewerLikedPost,
  update,
  findManyByUserId,
  findManyBySharePostId,
  addLike,
  removeLike,
  findLikersByPostId,
};

export { postRepository };
