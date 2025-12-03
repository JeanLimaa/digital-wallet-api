import { ApiProperty } from '@nestjs/swagger';

export class UserProfileResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'ID do usuário' })
  id: string;

  @ApiProperty({ example: 'João Silva', description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário' })
  email: string;
}

export class UserPublicProfileResponseDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário' })
  email: string;
}

export class UserBalanceResponseDto {
  @ApiProperty({ example: 1500.50, description: 'Saldo atual da carteira' })
  balance: number;
}
