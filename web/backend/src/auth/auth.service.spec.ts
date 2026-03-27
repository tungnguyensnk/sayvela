import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  const signAsync = jest.fn<
    Promise<string>,
    [{ sub: string; email: string }]
  >();
  const create = jest.fn<
    Promise<{ id: string; email: string } | null>,
    [string, string]
  >();
  const verify = jest.fn<
    Promise<{ id: string; email: string } | null>,
    [string, string]
  >();
  const jwt = { signAsync } as unknown as JwtService;
  const users = { create, verify } as unknown as UsersService;
  const service = new AuthService(jwt, users);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns null when register fails', async () => {
    create.mockResolvedValue(null);
    const res = await service.register('a@b.com', 'Admin@1234!');
    expect(res).toBeNull();
  });

  it('returns token when register succeeds', async () => {
    create.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    signAsync.mockResolvedValue('t1');
    const res = await service.register('a@b.com', 'Admin@1234!');
    expect(res).toEqual({ user: { id: 'u1', email: 'a@b.com' }, token: 't1' });
  });

  it('returns null when login fails', async () => {
    verify.mockResolvedValue(null);
    const res = await service.login('a@b.com', 'x');
    expect(res).toBeNull();
  });

  it('returns token when login succeeds', async () => {
    verify.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    signAsync.mockResolvedValue('t1');
    const res = await service.login('a@b.com', 'Admin@1234!');
    expect(res).toEqual({ user: { id: 'u1', email: 'a@b.com' }, token: 't1' });
  });
});
