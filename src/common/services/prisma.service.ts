import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Middleware to convert Decimal to number in all query results
    this.$use(async (params, next) => {
      const result = await next(params);
      return this.convertDecimalToNumber(result);
    });
  }

  /**
   * Recursively converts all Decimal values to numbers
   */
  private convertDecimalToNumber(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Decimal) {
      return obj.toNumber();
    }

    // Preserve Date objects as-is
    if (obj instanceof Date) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertDecimalToNumber(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = this.convertDecimalToNumber(value);
      }
      return converted;
    }

    return obj;
  }
}
