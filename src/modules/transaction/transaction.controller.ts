import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TransactionsService } from './transaction.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ReverseTransactionDto } from './dto/reverse-transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/GetUser.decorator';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('deposit')
  @ApiOperation({ 
    summary: 'Realizar depósito',
    description: 'Adiciona saldo à carteira do usuário autenticado.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Depósito realizado com sucesso',
    schema: {
      properties: {
        updatedUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            balance: { type: 'number', example: 150.00 },
          }
        },
        transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', example: 'DEPOSIT' },
            amount: { type: 'number', example: 100.00 },
            status: { type: 'string', example: 'COMPLETED' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  deposit(
    @Body() dto: CreateDepositDto,
    @GetUser('id') userId: string,
  ) {
    return this.transactionsService.deposit(dto, userId);
  }

  @Post('transfer')
  @ApiOperation({ 
    summary: 'Realizar transferência',
    description: 'Transfere saldo para outro usuário. Requer saldo suficiente.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Transferência realizada com sucesso',
    schema: {
      properties: {
        id: { type: 'string' },
        type: { type: 'string', example: 'TRANSFER' },
        amount: { type: 'number', example: 50.00 },
        status: { type: 'string', example: 'COMPLETED' },
        fromUserId: { type: 'string' },
        toUserId: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Saldo insuficiente ou dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Não é possível transferir para si mesmo' })
  @ApiResponse({ status: 404, description: 'Usuário destinatário não encontrado' })
  transfer(
    @Body() dto: CreateTransferDto,
    @GetUser('id') userId: string,
  ) {
    return this.transactionsService.transfer(dto, userId);
  }

  @Post('reverse/:transactionId')
  @ApiOperation({ 
    summary: 'Reverter transação',
    description: 'Reverte uma transação existente (depósito ou transferência). Apenas o remetente ou destinatário pode reverter.'
  })
  @ApiParam({ 
    name: 'transactionId', 
    description: 'ID da transação a ser revertida',
    type: 'string'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Transação revertida com sucesso',
    schema: {
      properties: {
        message: { type: 'string', example: 'Transação revertida com sucesso' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Transação já foi revertida ou não pode ser revertida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para reverter esta transação' })
  @ApiResponse({ status: 404, description: 'Transação não encontrada' })
  reverse(
    @Param() dto: ReverseTransactionDto,
    @GetUser('id') userId: string,
  ) {
    return this.transactionsService.reverse(dto, userId);
  }

  @Get('history')
  @ApiOperation({ 
    summary: 'Obter histórico de transações',
    description: 'Retorna todas as transações do usuário autenticado (enviadas e recebidas).'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de transações',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['DEPOSIT', 'TRANSFER', 'REVERSAL', 'RECEIVED'] },
          amount: { type: 'number' },
          status: { type: 'string', enum: ['COMPLETED', 'REVERSED'] },
          isPositive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          fromUser: { type: 'object', nullable: true },
          toUser: { type: 'object', nullable: true },
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  getTransactionHistory(
    @GetUser('id') userId: string,
  ) {
    return this.transactionsService.getTransactionHistory(userId);
  }
}