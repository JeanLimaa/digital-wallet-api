import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../modules/logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add requestId to request for tracking
    request.requestId = requestId;

    this.logger.log(`Incoming Request`, {
      requestId,
      method,
      path: url,
      userId: user?.id,
      body: this.sanitizeBody(body),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.log(`Request Completed`, {
            requestId,
            method,
            path: url,
            statusCode: context.switchToHttp().getResponse().statusCode,
            duration,
            userId: user?.id,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`Request Failed`, error.stack, {
            requestId,
            method,
            path: url,
            statusCode: error.status || 500,
            duration,
            userId: user?.id,
            errorMessage: error.message,
          });
        },
      }),
    );
  }

  // Remove sensitive data from logs
  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
