import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Client } = pg;

const adapter = new PrismaPg(
  new Client({
    connectionString: process.env.DATABASE_URL,
  })
);

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

const userRepository = {
  findByEmailOrUsername,
  createUserAccount,
  createUserProfile,
};

export { userRepository };
