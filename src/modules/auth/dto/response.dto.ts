import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvYW9AZW1haWwuY29tIiwiaWQiOiJ1dWlkLTEyMyIsIm5hbWUiOiJKb8OjbyBTaWx2YSIsImlhdCI6MTcwNDEyMDAwMH0.xxx',
    description: 'Token JWT para autenticação nas rotas protegidas' 
  })
  access_token: string;
}
