import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserPayload } from './interfaces/UserPayload.interface';
import { UserService } from '../user/user.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  public async register(dto: RegisterDto) {
    this.logger.log('Attempting to register new user', { email: dto.email });
    
    const userExists = await this.userService.findByEmail(dto.email);

    if (userExists) {
      this.logger.warn('Registration failed: email already exists', { email: dto.email });
      throw new ConflictException('E-mail já cadastrado');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.userService.createUser(dto.name, dto.email, hash);

    this.logger.log('User registered successfully', { userId: user.id, email: user.email });
    
    return this.generateToken(user.id, user.email, user.name);
  }

  public async login(dto: LoginDto) {
    this.logger.log('Login attempt', { email: dto.email });
    
    const user = await this.userService.findOrThrowByEmail(dto.email);

    if (!user) {
      this.logger.warn('Login failed: user not found', { email: dto.email });
      throw new UnauthorizedException('Não foi encontrado um usuário com esse e-mail');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      this.logger.logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', { email: dto.email, userId: user.id });
      throw new UnauthorizedException('Senha incorreta');
    }

    this.logger.log('Login successful', { userId: user.id, email: user.email });
    
    return this.generateToken(user.id, user.email, user.name);
  }

  private generateToken(userId: string, email: string, name: string) {
    const payload: UserPayload = { 
      email,
      id: userId,
      name
     };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}