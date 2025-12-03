import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transaction.service';
import { PrismaService } from '../../common/services/prisma.service';
import { UserService } from '../user/user.service';
import { ReversalStrategyFactory } from './strategies/reversal-strategy.factory';
import { LoggerService } from '../logger/logger.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: jest.Mocked<PrismaService>;
  let userService: jest.Mocked<UserService>;
  let reversalStrategyFactory: jest.Mocked<ReversalStrategyFactory>;

  const mockUser = {
    id: 'user-uuid-123',
    name: 'Test User',
    email: 'test@email.com',
    passwordHash: 'hashed_password',
    balance: new Decimal(100),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser2 = {
    id: 'user-uuid-456',
    name: 'Other User',
    email: 'other@email.com',
    passwordHash: 'hashed_password',
    balance: new Decimal(50),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
      user: {
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockUserService = {
      findOrThrowById: jest.fn(),
      findOrThrowByEmail: jest.fn(),
    };

    const mockReversalStrategyFactory = {
      getStrategy: jest.fn(),
    };

    const mockLoggerService = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logTransaction: jest.fn(),
      logSecurityEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
        { provide: ReversalStrategyFactory, useValue: mockReversalStrategyFactory },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get(PrismaService);
    userService = module.get(UserService);
    reversalStrategyFactory = module.get(ReversalStrategyFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    const depositDto = { amount: 100 };

    it('should deposit successfully', async () => {
      const updatedUser = { ...mockUser, balance: new Decimal(200) };
      const transaction = {
        id: 'tx-uuid-123',
        type: TransactionType.DEPOSIT,
        amount: new Decimal(100),
        toUserId: mockUser.id,
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
      };

      userService.findOrThrowById.mockResolvedValue(mockUser);
      (prisma.$transaction as jest.Mock).mockResolvedValue([updatedUser, transaction]);

      const result = await service.deposit(depositDto, mockUser.id);

      expect(userService.findOrThrowById).toHaveBeenCalledWith(mockUser.id);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ updatedUser, transaction });
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.findOrThrowById.mockRejectedValue(new NotFoundException());

      await expect(service.deposit(depositDto, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transfer', () => {
    const transferDto = { toUserEmail: 'other@email.com', amount: 50 };

    it('should transfer successfully', async () => {
      const transaction = {
        id: 'tx-uuid-123',
        type: TransactionType.TRANSFER,
        amount: new Decimal(50),
        fromUserId: mockUser.id,
        toUserId: mockUser2.id,
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
      };

      userService.findOrThrowById.mockResolvedValue(mockUser);
      userService.findOrThrowByEmail.mockResolvedValue(mockUser2);
      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}, transaction]);

      const result = await service.transfer(transferDto, mockUser.id);

      expect(userService.findOrThrowById).toHaveBeenCalledWith(mockUser.id);
      expect(userService.findOrThrowByEmail).toHaveBeenCalledWith(transferDto.toUserEmail);
      expect(result).toEqual(transaction);
    });

    it('should throw ForbiddenException when transferring to self', async () => {
      userService.findOrThrowById.mockResolvedValue(mockUser);
      userService.findOrThrowByEmail.mockResolvedValue(mockUser);

      await expect(
        service.transfer({ toUserEmail: mockUser.email, amount: 50 }, mockUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const poorUser = { ...mockUser, balance: new Decimal(10) };
      userService.findOrThrowById.mockResolvedValue(poorUser);
      userService.findOrThrowByEmail.mockResolvedValue(mockUser2);

      await expect(
        service.transfer({ toUserEmail: 'other@email.com', amount: 50 }, poorUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if recipient not found', async () => {
      userService.findOrThrowById.mockResolvedValue(mockUser);
      userService.findOrThrowByEmail.mockRejectedValue(new NotFoundException());

      await expect(
        service.transfer(transferDto, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reverse', () => {
    const reverseDto = { transactionId: 'tx-uuid-123' };

    const mockTransaction = {
      id: 'tx-uuid-123',
      type: TransactionType.TRANSFER,
      amount: new Decimal(50),
      fromUserId: mockUser.id,
      toUserId: mockUser2.id,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date(),
    };

    it('should reverse transaction successfully', async () => {
      const mockStrategy = {
        execute: jest.fn().mockReturnValue([]),
        validate: jest.fn().mockResolvedValue(undefined),
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);
      reversalStrategyFactory.getStrategy.mockReturnValue(mockStrategy);
      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const result = await service.reverse(reverseDto, mockUser.id);

      expect(reversalStrategyFactory.getStrategy).toHaveBeenCalledWith(mockTransaction);
      expect(mockStrategy.validate).toHaveBeenCalledWith(mockTransaction);
      expect(mockStrategy.execute).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual({ message: 'Transação revertida com sucesso' });
    });

    it('should reverse transaction without validate when strategy has no validate method', async () => {
      const mockStrategy = {
        execute: jest.fn().mockReturnValue([]),
        // No validate method
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);
      reversalStrategyFactory.getStrategy.mockReturnValue(mockStrategy);
      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const result = await service.reverse(reverseDto, mockUser.id);

      expect(mockStrategy.execute).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual({ message: 'Transação revertida com sucesso' });
    });

    it('should throw when strategy validation fails', async () => {
      const mockStrategy = {
        execute: jest.fn().mockReturnValue([]),
        validate: jest.fn().mockRejectedValue(new BadRequestException('Saldo insuficiente para reversão')),
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);
      reversalStrategyFactory.getStrategy.mockReturnValue(mockStrategy);

      await expect(service.reverse(reverseDto, mockUser.id)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transaction already reversed', async () => {
      const reversedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.REVERSED,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(reversedTransaction);

      await expect(service.reverse(reverseDto, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if trying to reverse a reversal', async () => {
      const reversalTransaction = {
        ...mockTransaction,
        type: TransactionType.REVERSAL,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(reversalTransaction);

      await expect(service.reverse(reverseDto, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user is not sender or receiver', async () => {
      const unrelatedTransaction = {
        ...mockTransaction,
        fromUserId: 'other-user-1',
        toUserId: 'other-user-2',
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(unrelatedTransaction);

      await expect(service.reverse(reverseDto, mockUser.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.reverse(reverseDto, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          type: TransactionType.DEPOSIT,
          amount: new Decimal(100),
          toUserId: mockUser.id,
          fromUserId: null,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          toUser: { email: mockUser.email, name: mockUser.name },
          fromUser: null,
          reversedTransaction: null,
        },
        {
          id: 'tx-2',
          type: TransactionType.TRANSFER,
          amount: new Decimal(50),
          fromUserId: mockUser.id,
          toUserId: mockUser2.id,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          toUser: { email: mockUser2.email, name: mockUser2.name },
          fromUser: { email: mockUser.email, name: mockUser.name },
          reversedTransaction: null,
        },
      ];

      userService.findOrThrowById.mockResolvedValue(mockUser);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await service.getTransactionHistory(mockUser.id);

      expect(userService.findOrThrowById).toHaveBeenCalledWith(mockUser.id);
      expect(prisma.transaction.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should mark received transfers correctly', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          type: TransactionType.TRANSFER,
          amount: new Decimal(50),
          fromUserId: mockUser2.id, // Received from another user
          toUserId: mockUser.id,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          toUser: { email: mockUser.email, name: mockUser.name },
          fromUser: { email: mockUser2.email, name: mockUser2.name },
          reversedTransaction: null,
        },
      ];

      userService.findOrThrowById.mockResolvedValue(mockUser);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await service.getTransactionHistory(mockUser.id);

      expect(result[0].type).toBe('RECEIVED');
      expect(result[0].isPositive).toBe(true);
    });
  });
});
