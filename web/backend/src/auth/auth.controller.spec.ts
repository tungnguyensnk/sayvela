import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const auth = {
    register: jest.fn(),
    login: jest.fn(),
  } as unknown as AuthService;
  const controller = new AuthController(auth);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns register result when registration succeeds', async () => {
    (auth.register as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'demo@sayvela.local' },
      token: 'token',
    });

    await expect(
      controller.register({
        email: 'demo@sayvela.local',
        password: 'Admin@1234!',
      }),
    ).resolves.toEqual({
      user: { id: 'u1', email: 'demo@sayvela.local' },
      token: 'token',
    });
  });

  it('throws friendly error when email already exists', async () => {
    (auth.register as jest.Mock).mockResolvedValue(null);

    await expect(
      controller.register({
        email: 'demo@sayvela.local',
        password: 'Admin@1234!',
      }),
    ).rejects.toEqual(
      new HttpException('invalid credentials', HttpStatus.BAD_REQUEST),
    );
  });

  it('throws unauthorized error when login fails', async () => {
    (auth.login as jest.Mock).mockResolvedValue(null);

    await expect(
      controller.login({
        email: 'demo@sayvela.local',
        password: 'wrong-password',
      }),
    ).rejects.toEqual(
      new HttpException('invalid credentials', HttpStatus.UNAUTHORIZED),
    );
  });
});
