import { HttpException, HttpStatus } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

type Req = { user?: { userId: string; email: string } };

const makeReq = (userId = 'u1'): Req => ({
  user: { userId, email: 'a@b.com' },
});

describe('SessionsController', () => {
  const createSession = jest.fn();
  const listSessions = jest.fn();
  const getSession = jest.fn();
  const updateSession = jest.fn();
  const deleteSession = jest.fn();
  const bulkInsertSegments = jest.fn();

  const service = {
    createSession,
    listSessions,
    getSession,
    updateSession,
    deleteSession,
    bulkInsertSegments,
  } as unknown as SessionsService;

  const ctrl = new SessionsController(service);

  beforeEach(() => jest.resetAllMocks());

  it('create — throws 401 without user', async () => {
    await expect(ctrl.create({ user: undefined } as Req, {})).rejects.toEqual(
      new HttpException('unauthorized', HttpStatus.UNAUTHORIZED),
    );
  });

  it('create — returns id', async () => {
    createSession.mockResolvedValue({ id: 's1' });
    const res = await ctrl.create(makeReq(), { title: 'T' });
    expect(res).toEqual({ id: 's1' });
  });

  it('list — returns paginated result', async () => {
    listSessions.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    const res = await ctrl.list(makeReq(), '1', '20');
    expect(res.total).toBe(0);
  });

  it('getOne — throws 404 when not found', async () => {
    getSession.mockResolvedValue(null);
    await expect(ctrl.getOne(makeReq(), 's1')).rejects.toEqual(
      new HttpException('not found', HttpStatus.NOT_FOUND),
    );
  });

  it('update — throws 404 when not found', async () => {
    updateSession.mockResolvedValue(false);
    await expect(ctrl.update(makeReq(), 's1', {})).rejects.toEqual(
      new HttpException('not found', HttpStatus.NOT_FOUND),
    );
  });

  it('update — returns ok', async () => {
    updateSession.mockResolvedValue(true);
    expect(await ctrl.update(makeReq(), 's1', {})).toEqual({ ok: true });
  });

  it('remove — throws 404 when not found', async () => {
    deleteSession.mockResolvedValue(false);
    await expect(ctrl.remove(makeReq(), 's1')).rejects.toEqual(
      new HttpException('not found', HttpStatus.NOT_FOUND),
    );
  });

  it('bulkSegments — returns ok', async () => {
    bulkInsertSegments.mockResolvedValue(true);
    const res = await ctrl.bulkSegments(makeReq(), 's1', {
      ids: [],
      segments: [{ id: 'g1', text: 'hi', startMs: 0, endMs: 100 }],
    });
    expect(res).toEqual({ ok: true });
  });
});
