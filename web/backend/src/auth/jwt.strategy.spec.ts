import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const findById = jest.fn();
  const users = { findById } as unknown as UsersService;
  let strategy: JwtStrategy;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy(users);
  });

  beforeEach(() => jest.resetAllMocks());

  it('returns the current database user', async () => {
    findById.mockResolvedValue({ id: 'u1', email: 'current@example.com' });
    await expect(
      strategy.validate({ sub: 'u1', email: 'old@example.com' }),
    ).resolves.toEqual({ userId: 'u1', email: 'current@example.com' });
  });

  it('rejects a token when the user no longer exists', async () => {
    findById.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: 'u1', email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
