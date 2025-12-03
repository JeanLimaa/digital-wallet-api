import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';

describe('Digital Wallet API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users data
  let userToken: string;
  let user2Token: string;
  let userId: string;
  let user2Id: string;
  let depositTransactionId: string;
  let transferTransactionId: string;

  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@email.com`,
    password: 'Password123!',
  };

  const testUser2 = {
    name: 'Test User 2',
    email: `test2-${Date.now()}@email.com`,
    password: 'Password456!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same pipes as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      // Delete transactions first (due to foreign key constraints)
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { fromUser: { email: { in: [testUser.email, testUser2.email] } } },
            { toUser: { email: { in: [testUser.email, testUser2.email] } } },
          ],
        },
      });

      // Delete test users
      await prisma.user.deleteMany({
        where: {
          email: { in: [testUser.email, testUser2.email] },
        },
      });
    } catch (error) {
      console.log('Cleanup error:', error);
    }

    await app.close();
  });

  // ==========================================
  // Health Check Tests
  // ==========================================
  describe('Health Check', () => {
    it('/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  // ==========================================
  // Authentication Tests
  // ==========================================
  describe('Auth - Registration', () => {
    it('/auth/register (POST) - should register first user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          userToken = res.body.access_token;
        });
    });

    it('/auth/register (POST) - should register second user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser2)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          user2Token = res.body.access_token;
        });
    });

    it('/auth/register (POST) - should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('já cadastrado');
        });
    });

    it('/auth/register (POST) - should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Invalid User',
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);
    });

    it('/auth/register (POST) - should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Invalid User',
          email: 'valid@email.com',
          password: '123',
        })
        .expect(400);
    });

    it('/auth/register (POST) - should fail with missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@email.com' })
        .expect(400);
    });
  });

  describe('Auth - Login', () => {
    it('/auth/login (POST) - should login successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          userToken = res.body.access_token;
        });
    });

    it('/auth/login (POST) - should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('/auth/login (POST) - should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@email.com',
          password: 'Password123!',
        })
        .expect(404);
    });
  });

  // ==========================================
  // User Profile Tests
  // ==========================================
  describe('User Profile', () => {
    it('/user/profile/me (GET) - should return authenticated user profile', () => {
      return request(app.getHttpServer())
        .get('/user/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', testUser.name);
          expect(res.body).toHaveProperty('email', testUser.email);
          expect(res.body).not.toHaveProperty('passwordHash');
          userId = res.body.id;
        });
    });

    it('/user/profile/me (GET) - should fail without auth token', () => {
      return request(app.getHttpServer())
        .get('/user/profile/me')
        .expect(401);
    });

    it('/user/profile/me (GET) - should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/user/profile/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('/user/profile/:email (GET) - should return user profile by email', () => {
      return request(app.getHttpServer())
        .get(`/user/profile/${testUser2.email}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name', testUser2.name);
          expect(res.body).toHaveProperty('email', testUser2.email);
        });
    });

    it('/user/profile/:email (GET) - should fail for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/user/profile/nonexistent@email.com')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('/user/balance (GET) - should return user balance', () => {
      return request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('balance');
          expect(parseFloat(res.body.balance)).toBe(0);
        });
    });

    it('/user/balance (GET) - get user2 id for later tests', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/profile/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      
      user2Id = res.body.id;
    });
  });

  // ==========================================
  // Transaction Tests - Deposit
  // ==========================================
  describe('Transactions - Deposit', () => {
    it('/transactions/deposit (POST) - should deposit successfully', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 500 })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('updatedUser');
          expect(res.body).toHaveProperty('transaction');
          expect(res.body.transaction).toHaveProperty('type', 'DEPOSIT');
          expect(res.body.transaction).toHaveProperty('status', 'COMPLETED');
          expect(parseFloat(res.body.transaction.amount)).toBe(500);
          depositTransactionId = res.body.transaction.id;
        });
    });

    it('/transactions/deposit (POST) - should update balance correctly', () => {
      return request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.balance)).toBe(500);
        });
    });

    it('/transactions/deposit (POST) - should fail with invalid amount', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: -100 })
        .expect(400);
    });

    it('/transactions/deposit (POST) - should fail with zero amount', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 0 })
        .expect(400);
    });

    it('/transactions/deposit (POST) - should fail without auth', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .send({ amount: 100 })
        .expect(401);
    });

    it('/transactions/deposit (POST) - deposit to user2 for transfer tests', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ amount: 200 })
        .expect(201);
    });
  });

  // ==========================================
  // Transaction Tests - Transfer
  // ==========================================
  describe('Transactions - Transfer', () => {
    it('/transactions/transfer (POST) - should transfer successfully', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          toUserEmail: testUser2.email,
          amount: 100,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('type', 'TRANSFER');
          expect(res.body).toHaveProperty('status', 'COMPLETED');
          expect(parseFloat(res.body.amount)).toBe(100);
          expect(res.body).toHaveProperty('fromUserId', userId);
          expect(res.body).toHaveProperty('toUserId', user2Id);
          transferTransactionId = res.body.id;
        });
    });

    it('/transactions/transfer (POST) - should update sender balance', () => {
      return request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.balance)).toBe(400); // 500 - 100
        });
    });

    it('/transactions/transfer (POST) - should update receiver balance', () => {
      return request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.balance)).toBe(300); // 200 + 100
        });
    });

    it('/transactions/transfer (POST) - should fail with insufficient balance', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          toUserEmail: testUser2.email,
          amount: 10000, // More than balance
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('insuficiente');
        });
    });

    it('/transactions/transfer (POST) - should fail transfer to self', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          toUserEmail: testUser.email,
          amount: 50,
        })
        .expect(403);
    });

    it('/transactions/transfer (POST) - should fail with non-existent recipient', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          toUserEmail: 'nonexistent@email.com',
          amount: 50,
        })
        .expect(404);
    });

    it('/transactions/transfer (POST) - should fail with invalid amount', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          toUserEmail: testUser2.email,
          amount: -50,
        })
        .expect(400);
    });
  });

  // ==========================================
  // Transaction Tests - History
  // ==========================================
  describe('Transactions - History', () => {
    it('/transactions/history (GET) - should return transaction history', () => {
      return request(app.getHttpServer())
        .get('/transactions/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2); // deposit + transfer
          
          // Verify deposit transaction
          const deposit = res.body.find((tx: any) => tx.type === 'DEPOSIT');
          expect(deposit).toBeDefined();
          expect(deposit.isPositive).toBe(true);
          
          // Verify transfer transaction (sent)
          const transfer = res.body.find((tx: any) => tx.type === 'TRANSFER');
          expect(transfer).toBeDefined();
          expect(transfer.isPositive).toBe(false);
        });
    });

    it('/transactions/history (GET) - should mark received transfers correctly', () => {
      return request(app.getHttpServer())
        .get('/transactions/history')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          // User2 received a transfer, should be marked as RECEIVED
          const received = res.body.find((tx: any) => tx.type === 'RECEIVED');
          expect(received).toBeDefined();
          expect(received.isPositive).toBe(true);
        });
    });

    it('/transactions/history (GET) - should fail without auth', () => {
      return request(app.getHttpServer())
        .get('/transactions/history')
        .expect(401);
    });
  });

  // ==========================================
  // Transaction Tests - Reversal
  // ==========================================
  describe('Transactions - Reversal', () => {
    it('/transactions/reverse/:id (POST) - should reverse transfer successfully', () => {
      return request(app.getHttpServer())
        .post(`/transactions/reverse/${transferTransactionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('sucesso');
        });
    });

    it('/transactions/reverse/:id (POST) - balances should be restored after reversal', async () => {
      // User1 should have balance restored (400 + 100 = 500)
      const res1 = await request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(parseFloat(res1.body.balance)).toBe(500);

      // User2 should have balance reduced (300 - 100 = 200)
      const res2 = await request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      
      expect(parseFloat(res2.body.balance)).toBe(200);
    });

    it('/transactions/reverse/:id (POST) - should fail to reverse already reversed transaction', () => {
      return request(app.getHttpServer())
        .post(`/transactions/reverse/${transferTransactionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('já foi revertida');
        });
    });

    it('/transactions/reverse/:id (POST) - should reverse deposit successfully', () => {
      return request(app.getHttpServer())
        .post(`/transactions/reverse/${depositTransactionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);
    });

    it('/transactions/reverse/:id (POST) - balance should be reduced after deposit reversal', () => {
      return request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.balance)).toBe(0); // 500 - 500 = 0
        });
    });

    it('/transactions/reverse/:id (POST) - should fail for non-existent transaction', () => {
      return request(app.getHttpServer())
        .post('/transactions/reverse/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('/transactions/reverse/:id (POST) - should fail when user is not sender/receiver', async () => {
      // Create a new deposit for user2
      const depositRes = await request(app.getHttpServer())
        .post('/transactions/deposit')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ amount: 50 })
        .expect(201);

      // Try to reverse user2's deposit with user1's token
      return request(app.getHttpServer())
        .post(`/transactions/reverse/${depositRes.body.transaction.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==========================================
  // Edge Cases and Security Tests
  // ==========================================
  describe('Security and Edge Cases', () => {
    it('should reject requests with malformed JSON', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": invalid}')
        .expect(400);
    });

    it('should reject extra fields in request body (whitelist)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          extraField: 'should be rejected',
        })
        .expect(400);
    });

    it('should handle concurrent deposits correctly', async () => {
      // Login user2 to get fresh token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser2.email,
          password: testUser2.password,
        });
      
      const token = loginRes.body.access_token;

      // Get initial balance
      const initialBalanceRes = await request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${token}`);
      
      const initialBalance = parseFloat(initialBalanceRes.body.balance);

      // Make concurrent deposits
      const deposits = await Promise.all([
        request(app.getHttpServer())
          .post('/transactions/deposit')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 10 }),
        request(app.getHttpServer())
          .post('/transactions/deposit')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 20 }),
        request(app.getHttpServer())
          .post('/transactions/deposit')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 30 }),
      ]);

      // All deposits should succeed
      deposits.forEach((res) => {
        expect(res.status).toBe(201);
      });

      // Final balance should be correct
      const finalBalanceRes = await request(app.getHttpServer())
        .get('/user/balance')
        .set('Authorization', `Bearer ${token}`);
      
      expect(parseFloat(finalBalanceRes.body.balance)).toBe(initialBalance + 60);
    });
  });
});
