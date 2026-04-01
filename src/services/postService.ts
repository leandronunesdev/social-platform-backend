import { postRepository } from "../repositories/postRepository";
import { userRepository } from "../repositories/userRepository";

export type PostDto = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function mapPost(row: {
  id: string;
  userAccountId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): PostDto {
  return {
    id: row.id,
    userId: row.userAccountId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const createPost = async (
  userAccountId: string,
  content: string,
): Promise<PostDto> => {
  const row = await postRepository.create({ userAccountId, content });
  return mapPost(row);
};

const updatePost = async (params: {
  postId: string;
  userAccountId: string;
  content: string;
}): Promise<PostDto> => {
  const existing = await postRepository.findById(params.postId);
  if (!existing) {
    throw new Error("POST_NOT_FOUND");
  }
  if (existing.userAccountId !== params.userAccountId) {
    throw new Error("POST_FORBIDDEN");
  }
  const row = await postRepository.update({
    id: params.postId,
    content: params.content,
  });
  return mapPost(row);
};

const listPostsByUser = async (params: {
  userAccountId: string;
  page: number;
  limit: number;
}) => {
  const user = await userRepository.findById(params.userAccountId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  const skip = (params.page - 1) * params.limit;
  const { items, total } = await postRepository.findManyByUserId({
    userAccountId: params.userAccountId,
    skip,
    take: params.limit,
  });
  return {
    data: items.map(mapPost),
    page: params.page,
    limit: params.limit,
    total,
  };
};

const postService = {
  createPost,
  updatePost,
  listPostsByUser,
};

export { postService };
