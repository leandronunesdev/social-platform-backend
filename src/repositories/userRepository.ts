import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const findByEmailOrUsername = async (email: string, username: string) => {
  return prisma.userAccount.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });
};

const createUserAccount = async (data: {
  name: string;
  username: string;
  email: string;
  password: string;
}) => {
  return prisma.userAccount.create({
    data: {
      name: data.name,
      username: data.username,
      email: data.email,
      password: data.password,
      isDeleted: false,
    },
  });
};

const createUserProfile = async (userAccountId: string) => {
  return prisma.userProfile.create({
    data: {
      userAccountId,
      bio: "",
      country: "",
      state: "",
      city: "",
      avatarUrl: "",
    },
  });
};

const findUserProfile = async (userAccountId: string) => {
  return prisma.userProfile.findUnique({
    where: {
      userAccountId,
    },
  });
};

const updateUserProfile = async (
  userAccountId: string,
  data: {
    bio?: string | undefined;
    country?: string | undefined;
    state?: string | undefined;
    city?: string | undefined;
    avatarUrl?: string | undefined;
  }
) => {
  const updateData: {
    bio?: string;
    country?: string;
    state?: string;
    city?: string;
    avatarUrl?: string;
  } = {};
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

  return prisma.userProfile.update({
    where: {
      userAccountId,
    },
    data: updateData,
  });
};

const userRepository = {
  findByEmailOrUsername,
  createUserAccount,
  createUserProfile,
  findUserProfile,
  updateUserProfile,
};

export { userRepository };
