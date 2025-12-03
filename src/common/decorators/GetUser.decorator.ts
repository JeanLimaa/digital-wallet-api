import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../../modules/auth/interfaces/UserPayload.interface';

export const GetUser = createParamDecorator(
  (data: keyof UserPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // If a specific field is specified, return only that field (e.g., id, email, etc.)
    return data ? user?.[data] : user;
  },
);
