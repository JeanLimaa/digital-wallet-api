import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('UserService', () => {
  let service: UserService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-uuid-123',
    name: 'Test User',
    email: 'test@email.com',
    passwordHash: 'hashed_password',
    balance: new Decimal(100.50),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.createUser(
        'Test User',
        'test@email.com',
        'hashed_password',
      );

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Test User',
          email: 'test@email.com',
          passwordHash: 'hashed_password',
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@email.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@email.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@email.com');

      expect(result).toBeNull();
    });
  });

  describe('findOrThrowByEmail', () => {
    it('should return user if found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOrThrowByEmail('test@email.com');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOrThrowByEmail('nonexistent@email.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrThrowById', () => {
    it('should return user if found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOrThrowById('user-uuid-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOrThrowById('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive data', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfile('user-uuid-123');

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('balance');
    });
  });

  describe('getProfileByEmail', () => {
    it('should return user profile by email without sensitive data', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfileByEmail('test@email.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@email.com' },
      });
      expect(result).toEqual({
        name: mockUser.name,
        email: mockUser.email,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('id');
    });

    it('should throw NotFoundException if user not found by email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getProfileByEmail('nonexistent@email.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBalance', () => {
    it('should return user balance', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getBalance('user-uuid-123');

      expect(result).toEqual({ balance: mockUser.balance });
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getBalance('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
