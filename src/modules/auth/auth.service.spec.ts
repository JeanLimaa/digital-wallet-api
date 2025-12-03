import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../logger/logger.service';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-uuid-123',
    name: 'Test User',
    email: 'test@email.com',
    passwordHash: 'hashed_password',
    balance: new Decimal(0),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserService = {
      findByEmail: jest.fn(),
      findOrThrowByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
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
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@email.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt_token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.register(registerDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userService.createUser).toHaveBeenCalledWith(
        registerDto.name,
        registerDto.email,
        'hashed_password',
      );
      expect(result).toEqual({ access_token: 'jwt_token' });
    });

    it('should throw ConflictException if email already exists', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@email.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      userService.findOrThrowByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login(loginDto);

      expect(userService.findOrThrowByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(result).toEqual({ access_token: 'jwt_token' });
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      userService.findOrThrowByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userService.findOrThrowByEmail.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });
});