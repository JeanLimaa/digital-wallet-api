import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UserService } from "./user.service";
import { GetUser } from "src/common/decorators/GetUser.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { 
    UserProfileResponseDto, 
    UserPublicProfileResponseDto, 
    UserBalanceResponseDto 
} from "./dto/response.dto";

@ApiTags('User')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('profile/me')
    @ApiOperation({ 
        summary: 'Obter perfil do usuário autenticado',
        description: 'Retorna os dados do perfil do usuário logado.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Dados do perfil',
        type: UserProfileResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    getMyProfile(
        @GetUser('id') userId: string,
    ) {
        return this.userService.getProfile(userId);
    }

    @Get('profile/:email')
    @ApiOperation({ 
        summary: 'Buscar usuário por e-mail',
        description: 'Retorna dados públicos de um usuário pelo e-mail (útil para validar destinatário antes de transferir).'
    })
    @ApiParam({ name: 'email', description: 'E-mail do usuário', type: 'string' })
    @ApiResponse({ 
        status: 200, 
        description: 'Dados públicos do usuário',
        type: UserPublicProfileResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    getProfile(
        @Param('email') email: string,
    ) {
        return this.userService.getProfileByEmail(email);
    }

    @Get('balance')
    @ApiOperation({ 
        summary: 'Obter saldo da carteira',
        description: 'Retorna o saldo atual da carteira do usuário autenticado.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Saldo da carteira',
        type: UserBalanceResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    getBalance(
        @GetUser('id') userId: string,
    ) {
        return this.userService.getBalance(userId);
    }
}