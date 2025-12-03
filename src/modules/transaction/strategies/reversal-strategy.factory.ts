import { Transaction, TransactionType } from "@prisma/client";
import { ReversalStrategy } from "../interface/reversal.strategy.interface";
import { BadRequestException, Injectable } from "@nestjs/common";
import { TransferReversalStrategy } from "./transfer-reversal.strategy";
import { DepositReversalStrategy } from "./deposit-reversal.strategy";

@Injectable()
export class ReversalStrategyFactory {
  constructor(
    private readonly transferReversalStrategy: TransferReversalStrategy,
    private readonly depositReversalStrategy: DepositReversalStrategy,
  ) {}

  getStrategy(transaction: Transaction): ReversalStrategy {
    switch (transaction.type) {
      case TransactionType.TRANSFER:
        return this.transferReversalStrategy;
      case TransactionType.DEPOSIT:
        return this.depositReversalStrategy;
      default:
        throw new BadRequestException('Tipo de transação não suportado para reversão');
    }
  }
}