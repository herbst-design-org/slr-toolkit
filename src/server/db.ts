import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends({
    query: {
      item: {
        // as soon as an item is updated, mark all its vectors as stale so they can be updated
        async update({ args, query }) {
          args.data = {
            ...args.data,
            vectors: {
              updateMany: {
                where: { isStale: false },
                data: { isStale: true },
              },
            },
          };
          return query(args);
        },
      },
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
