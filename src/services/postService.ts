import { postRepository } from "../repositories/postRepository";
import { userRepository } from "../repositories/userRepository";

export type PostDto = {
  id: string;
  userId: string;
  content: string;
  sharesCount: number;
  likesCount: number;
  sharePostId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostLikerDto = {
  userId: string;
  username: string;
  name: string;
  likedAt: string;
};

function mapPost(row: {
  id: string;
  userAccountId: string;
  content: string;
  sharesCount: number;
  likesCount: number;
  sharePostId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PostDto {
  return {
    id: row.id,
    userId: row.userAccountId,
    content: row.content,
    sharesCount: row.sharesCount,
    likesCount: row.likesCount,
    sharePostId: row.sharePostId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const createPost = async (params: {
  userAccountId: string;
  content: string;
  sharePostId?: string | undefined;
}): Promise<PostDto> => {
  const row = await postRepository.create({
    userAccountId: params.userAccountId,
    content: params.content,
    sharePostId: params.sharePostId ?? null,
  });
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

const listSharesOfPost = async (params: {
  sharePostId: string;
  page: number;
  limit: number;
}) => {
  const original = await postRepository.findById(params.sharePostId);
  if (!original) {
    throw new Error("POST_NOT_FOUND");
  }
  const skip = (params.page - 1) * params.limit;
  const { items, total } = await postRepository.findManyBySharePostId({
    sharePostId: params.sharePostId,
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

const likePost = async (params: { postId: string; userAccountId: string }) => {
  return postRepository.addLike(params.userAccountId, params.postId);
};

const unlikePost = async (params: {
  postId: string;
  userAccountId: string;
}) => {
  return postRepository.removeLike(params.userAccountId, params.postId);
};

const listPostLikers = async (params: {
  postId: string;
  page: number;
  limit: number;
}) => {
  const skip = (params.page - 1) * params.limit;
  const { rows, total } = await postRepository.findLikersByPostId({
    postId: params.postId,
    skip,
    take: params.limit,
  });
  const data: PostLikerDto[] = rows.map((row) => ({
    userId: row.UserAccount.id,
    username: row.UserAccount.username,
    name: row.UserAccount.name,
    likedAt: row.createdAt.toISOString(),
  }));
  return {
    data,
    page: params.page,
    limit: params.limit,
    total,
  };
};

const postService = {
  createPost,
  updatePost,
  listPostsByUser,
  listSharesOfPost,
  likePost,
  unlikePost,
  listPostLikers,
};

export { postService };
