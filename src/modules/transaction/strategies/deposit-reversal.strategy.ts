import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, Transaction, TransactionStatus, TransactionType, User } from "@prisma/client";
import { ReversalStrategy } from "../interface/reversal.strategy.interface";
import { PrismaService } from "../../../common/services/prisma.service";

@Injectable()
export class DepositReversalStrategy implements ReversalStrategy {
  constructor(private prisma: PrismaService) {}

  async validate(transaction: Transaction): Promise<void> {
    if (!transaction.toUserId) {
      throw new BadRequestException('Transação de depósito mal formada');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: transaction.toUserId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (Number(user.balance) < Number(transaction.amount)) {
      throw new BadRequestException(
        'Saldo insuficiente para reverter o depósito. O usuário deve ter saldo igual ou maior ao valor do depósito.'
      );
    }
  }

  execute(transaction: Transaction): Prisma.PrismaPromise<unknown>[] {
    return [
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
          toUserId: transaction.toUserId,
          reversedTransactionId: transaction.id,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ];
  }
}