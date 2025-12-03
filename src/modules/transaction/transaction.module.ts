import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { UserModule } from '../user/user.module';
import { TransactionsService } from './transaction.service';
import { TransactionsController } from './transaction.controller';
import { ReversalStrategyFactory } from './strategies/reversal-strategy.factory';
import { TransferReversalStrategy } from './strategies/transfer-reversal.strategy';
import { DepositReversalStrategy } from './strategies/deposit-reversal.strategy';

@Module({
  imports: [
    UserModule
  ],
  providers: [
    TransactionsService,
    PrismaService,
    ReversalStrategyFactory,
    TransferReversalStrategy,
    DepositReversalStrategy
  ],
  controllers: [TransactionsController],
})
export class TransactionModule {}
