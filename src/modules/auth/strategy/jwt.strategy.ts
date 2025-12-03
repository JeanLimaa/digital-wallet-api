import { Injectable } from '@nestjs/common';
import { UserPayload } from '../interfaces/UserPayload.interface';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface RequestWithCookies extends Request {
  cookies: { [key: string]: string };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken()
      ]),
      ignoreExpiration: process.env.NODE_ENV === 'development' ? true : false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
    });
  }

  async validate(payload: UserPayload) {
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
    };
  }
}
