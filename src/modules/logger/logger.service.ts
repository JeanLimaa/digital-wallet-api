import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const pinoLogger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logger: Logger;

  constructor() {
    this.logger = pinoLogger;
  }

  setContext(context: string) {
    this.context = context;
    this.logger = pinoLogger.child({ context });
  }

  private buildLogObject(context?: LogContext | string): Record<string, unknown> {
    if (typeof context === 'string') {
      return { additionalContext: context };
    }
    return context || {};
  }

  log(message: string, context?: LogContext | string) {
    this.logger.info(this.buildLogObject(context), message);
  }

  error(message: string, trace?: string, context?: LogContext | string) {
    const ctx = this.buildLogObject(context);
    if (trace) {
      ctx.trace = trace;
    }
    this.logger.error(ctx, message);
  }

  warn(message: string, context?: LogContext | string) {
    this.logger.warn(this.buildLogObject(context), message);
  }

  debug(message: string, context?: LogContext | string) {
    this.logger.debug(this.buildLogObject(context), message);
  }

  verbose(message: string, context?: LogContext | string) {
    this.logger.trace(this.buildLogObject(context), message);
  }

  // Specific methods for financial transactions
  logTransaction(type: string, details: Record<string, unknown>) {
    this.logger.info(
      {
        transactionType: type,
        ...details,
      },
      `Transaction: ${type}`,
    );
  }

  logSecurityEvent(event: string, details: Record<string, unknown>) {
    this.logger.warn(
      {
        securityEvent: event,
        ...details,
      },
      `Security Event: ${event}`,
    );
  }
}

// Export Pino instance for direct use if needed
export { pinoLogger };
