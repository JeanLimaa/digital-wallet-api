import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, Transaction, TransactionStatus, TransactionType } from "@prisma/client";
import { ReversalStrategy } from "../interface/reversal.strategy.interface";
import { PrismaService } from "../../../common/services/prisma.service";

@Injectable()
export class TransferReversalStrategy implements ReversalStrategy {
  constructor(private prisma: PrismaService) {}

  execute(transaction: Transaction): Prisma.PrismaPromise<unknown>[] {
    if (!transaction.fromUserId || !transaction.toUserId) {
      throw new BadRequestException('Transação de transferência mal formada');
    }

    return [
      this.prisma.user.update({
        where: { id: transaction.fromUserId },
        data: { balance: { increment: transaction.amount } },
      }),
      this.prisma.user.update({
        where: { id: transaction.toUserId },
        data: { balance: { decrement: transaction.amount } },
      }),
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.REVERSED },
      }),
      this.prisma.transaction.create({
        data: {
          type: TransactionType.REVERSAL,
          amount: transaction.amount,
          fromUserId: transaction.toUserId,
          toUserId: transaction.fromUserId,
          reversedTransactionId: transaction.id,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ];
  }
}