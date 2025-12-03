import { IsNumber, Min, IsEmail, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({
    description: 'E-mail do usuário destinatário',
    example: 'destinatario@email.com',
  })
  @IsEmail({}, { message: 'O e-mail do destinatário deve ser válido' })
  toUserEmail: string;

  @ApiProperty({
    description: 'Valor da transferência em reais',
    example: 50.00,
    minimum: 0.01,
    maximum: 99999999.99,
  })
  @IsNumber({}, { message: 'O valor deve ser um número' })
  @Min(0.01, { message: 'Valor mínimo de transferência é R$ 0,01' })
  @Max(99999999.99, { message: 'Valor máximo permitido é R$ 99.999.999,99' })
  amount: number;
}
