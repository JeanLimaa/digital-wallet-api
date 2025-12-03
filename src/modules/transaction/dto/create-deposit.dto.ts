import { IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepositDto {
  @ApiProperty({
    description: 'Valor do depósito em reais',
    example: 100.00,
    minimum: 0.01,
    maximum: 99999999.99,
  })
  @IsNumber({}, {message: 'O valor deve ser um número'})
  @Min(0.01, {message: 'Valor mínimo de depósito é R$ 0,01'})
  @Max(99999999.99, { message: 'Valor máximo permitido é R$ 99.999.999,99' })
  amount: number;
}
