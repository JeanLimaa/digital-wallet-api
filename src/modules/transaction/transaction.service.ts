import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ReverseTransactionDto } from './dto/reverse-transaction.dto';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { UserService } from '../user/user.service';
import { ReversalStrategyFactory } from './strategies/reversal-strategy.factory';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly reversalStrategyFactory: ReversalStrategyFactory,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TransactionsService.name);
  }

  public async deposit(dto: CreateDepositDto, userId: string) {
    this.logger.log('Processing deposit', { userId, amount: dto.amount });
    
    await this.userService.findOrThrowById(userId);

    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: dto.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          type: TransactionType.DEPOSIT,
          amount: dto.amount,
          toUserId: userId,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ]);

    this.logger.logTransaction('DEPOSIT', {
      transactionId: transaction.id,
      userId,
      amount: dto.amount,
      newBalance: updatedUser.balance,
    });

    return { updatedUser, transaction };
  }

  public async transfer(dto: CreateTransferDto, fromUserId: string) {
    this.logger.log('Processing transfer', { fromUserId, toEmail: dto.toUserEmail, amount: dto.amount });
    
    const fromUser = await this.userService.findOrThrowById(fromUserId);
    const toUser = await this.userService.findOrThrowByEmail(dto.toUserEmail);
    
    if (fromUserId === toUser.id) {
      this.logger.warn('Transfer to self attempted', { userId: fromUserId });
      throw new ForbiddenException('Você não pode transferir para si mesmo');
    }

    if (Number(fromUser.balance) < dto.amount) {
      this.logger.warn('Transfer failed: insufficient balance', {
        userId: fromUserId,
        balance: fromUser.balance,
        requestedAmount: dto.amount,
      });
      throw new BadRequestException('Saldo insuficiente');
    }

    const [_, __, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: fromUserId },
        data: { balance: { decrement: dto.amount } },
      }),
      this.prisma.user.update({
        where: { id: toUser.id },
        data: { balance: { increment: dto.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          type: TransactionType.TRANSFER,
          amount: dto.amount,
          fromUserId,
          toUserId: toUser.id,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ]);

    this.logger.logTransaction('TRANSFER', {
      transactionId: transaction.id,
      fromUserId,
      toUserId: toUser.id,
      amount: dto.amount,
    });

    return transaction;
  }

  public async reverse(dto: ReverseTransactionDto, userId: string) {
    this.logger.log('Processing reversal', { transactionId: dto.transactionId, userId });
    
    const transaction = await this.findTransactionOrThrowById(dto.transactionId);

    if (transaction.status === TransactionStatus.REVERSED) {
      this.logger.warn('Reversal failed: transaction already reversed', { transactionId: dto.transactionId });
      throw new BadRequestException('Transação já foi revertida');
    }

    if (transaction.type === TransactionType.REVERSAL) {
      this.logger.warn('Reversal failed: cannot reverse a reversal', { transactionId: dto.transactionId });
      throw new BadRequestException('Não é possível reverter uma transação de reversão');
    }

    const isSenderOrReceiver = transaction.fromUserId === userId || transaction.toUserId === userId;
    if (!isSenderOrReceiver) {
      this.logger.logSecurityEvent('UNAUTHORIZED_REVERSAL_ATTEMPT', {
        transactionId: dto.transactionId,
        userId,
        transactionOwnerId: transaction.fromUserId || transaction.toUserId,
      });
      throw new ForbiddenException('Você não tem permissão para reverter esta transação');
    }

    const strategy = this.reversalStrategyFactory.getStrategy(transaction);
    
    // If the strategy implements validation, execute it first
    if (strategy.validate) {
      await strategy.validate(transaction);
    }
    
    const operations = strategy.execute(transaction);

    await this.prisma.$transaction(operations);

    this.logger.logTransaction('REVERSAL', {
      originalTransactionId: dto.transactionId,
      originalType: transaction.type,
      amount: transaction.amount,
      userId,
    });

    return { message: 'Transação revertida com sucesso' };
  }

  public async getTransactionHistory(userId: string) {
    await this.userService.findOrThrowById(userId);
    
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        toUser: {
          select: {
            email: true,
            name: true,
          }
        },
        fromUser: {
          select: {
            email: true,
            name: true,
          }
        },
        reversedTransaction: {
          select: {
            id: true,
            amount: true,
            type: true,
            createdAt: true,
          }
        }
      }
    });

    // If the user is the one who received the deposit/transfer, the type becomes RECEIVED
    const adjustedTransactions = transactions.map(tx => {
      const isReceived = tx.type === 'TRANSFER' && tx.toUserId === userId && tx.fromUserId !== userId;
      const isPositive = 
        tx.type === 'DEPOSIT' 
        || (tx.type === 'TRANSFER' && tx.toUserId === userId)
        || (tx.type === 'REVERSAL' && tx.reversedTransaction.type === "TRANSFER" && tx.toUserId === userId);
      
      const received = {...tx, isPositive, type: 'RECEIVED'};
      if (isReceived) return received
      
      return {...tx, isPositive};
    });

    return adjustedTransactions;
  }

  private async findTransactionOrThrowById(id: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    return transaction;
  }
}