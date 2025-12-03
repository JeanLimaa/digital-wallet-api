import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  public async createUser(name: string, email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: { name, email, passwordHash },
    });
  }

  public async findByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  public async findOrThrowByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  public async findOrThrowById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  public async getProfile(userId: string) {
    const user = await this.findOrThrowById(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  public async getProfileByEmail(email: string) {
    const user = await this.findOrThrowByEmail(email);

    return {
      name: user.name,
      email: user.email,
    };
  }

  public async getBalance(userId: string) {
    const user = await this.findOrThrowById(userId);

    return {
      balance: user.balance,
    };
  }
}
