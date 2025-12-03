import { ApiProperty } from '@nestjs/swagger';

export class UserBalanceResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'ID do usuário' })
  id: string;

  @ApiProperty({ example: 'João Silva', description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário' })
  email: string;

  @ApiProperty({ example: 1500.50, description: 'Saldo atual da carteira' })
  balance: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Data de criação' })
  createdAt: Date;
}

export class TransactionResponseDto {
  @ApiProperty({ example: 'uuid-456', description: 'ID da transação' })
  id: string;

  @ApiProperty({ 
    example: 'DEPOSIT', 
    enum: ['DEPOSIT', 'TRANSFER', 'REVERSAL'],
    description: 'Tipo da transação' 
  })
  type: string;

  @ApiProperty({ example: 100.00, description: 'Valor da transação' })
  amount: number;

  @ApiProperty({ 
    example: 'COMPLETED', 
    enum: ['COMPLETED', 'REVERSED'],
    description: 'Status da transação' 
  })
  status: string;

  @ApiProperty({ example: null, nullable: true, description: 'ID do remetente (null para depósitos)' })
  fromUserId: string | null;

  @ApiProperty({ example: 'uuid-123', description: 'ID do destinatário' })
  toUserId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Data da transação' })
  createdAt: Date;
}

export class DepositResponseDto {
  @ApiProperty({ type: UserBalanceResponseDto, description: 'Dados do usuário atualizado' })
  updatedUser: UserBalanceResponseDto;

  @ApiProperty({ type: TransactionResponseDto, description: 'Dados da transação criada' })
  transaction: TransactionResponseDto;
}

export class TransferResponseDto extends TransactionResponseDto {
  @ApiProperty({ example: 'uuid-789', description: 'ID do remetente' })
  fromUserId: string;
}

export class ReverseResponseDto {
  @ApiProperty({ example: 'Transação revertida com sucesso', description: 'Mensagem de confirmação' })
  message: string;
}

export class UserPublicDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário' })
  email: string;
}

export class TransactionHistoryItemDto {
  @ApiProperty({ example: 'uuid-456', description: 'ID da transação' })
  id: string;

  @ApiProperty({ 
    example: 'DEPOSIT', 
    enum: ['DEPOSIT', 'TRANSFER', 'REVERSAL', 'RECEIVED'],
    description: 'Tipo da transação (RECEIVED indica transferência recebida)' 
  })
  type: string;

  @ApiProperty({ example: 100.00, description: 'Valor da transação' })
  amount: number;

  @ApiProperty({ 
    example: 'COMPLETED', 
    enum: ['COMPLETED', 'REVERSED'],
    description: 'Status da transação' 
  })
  status: string;

  @ApiProperty({ example: true, description: 'Se a transação é positiva para o saldo (entrada)' })
  isPositive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Data da transação' })
  createdAt: Date;

  @ApiProperty({ type: UserPublicDto, nullable: true, description: 'Usuário remetente' })
  fromUser: UserPublicDto | null;

  @ApiProperty({ type: UserPublicDto, nullable: true, description: 'Usuário destinatário' })
  toUser: UserPublicDto | null;
}
