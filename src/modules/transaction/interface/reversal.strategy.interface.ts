import { Prisma, Transaction } from "@prisma/client";

export interface ReversalStrategy {
  validate?(transaction: Transaction): Promise<void>;
  execute(transaction: Transaction): Prisma.PrismaPromise<unknown>[];
}