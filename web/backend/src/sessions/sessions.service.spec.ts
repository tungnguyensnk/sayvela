import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';

const mockSession = {
  id: 's1',
  userId: 'u1',
  title: 'Test session',
  durationSeconds: 0,
  status: 'active',
  summary: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('SessionsService', () => {
  const create = jest.fn<
    Promise<string>,
    [{ userId: string; title?: string }]
  >();
  const findByUser = jest.fn();
  const findById = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const insertSegments = jest.fn();
  const findSegmentsBySession = jest.fn();
  const countByUser = jest.fn();

  const repo = {
    create,
    findByUser,
    findById,
    update,
    remove,
    insertSegments,
    findSegmentsBySession,
    countByUser,
  } as unknown as SessionsRepository;

  const service = new SessionsService(repo);

  beforeEach(() => jest.resetAllMocks());

  describe('createSession', () => {
    it('returns id on success', async () => {
      create.mockResolvedValue('s1');
      const res = await service.createSession({
        userId: 'u1',
        title: 'T',
      });
      expect(res).toEqual({ id: 's1' });
      expect(create).toHaveBeenCalledWith({
        userId: 'u1',
        title: 'T',
      });
    });
  });

  describe('listSessions', () => {
    it('returns paginated list', async () => {
      findByUser.mockResolvedValue([mockSession]);
      countByUser.mockResolvedValue(1);
      const res = await service.listSessions('u1', 1, 20);
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(findByUser).toHaveBeenCalledWith('u1', 20, 0);
    });
  });

  describe('getSession', () => {
    it('returns null when session not found', async () => {
      findById.mockResolvedValue(null);
      const res = await service.getSession('u1', 's1');
      expect(res).toBeNull();
    });

    it('returns null when userId mismatch', async () => {
      findById.mockResolvedValue({ ...mockSession, userId: 'other' });
      const res = await service.getSession('u1', 's1');
      expect(res).toBeNull();
    });

    it('returns session with segments', async () => {
      findById.mockResolvedValue(mockSession);
      findSegmentsBySession.mockResolvedValue([]);
      const res = await service.getSession('u1', 's1');
      expect(res).toMatchObject({ id: 's1', segments: [] });
    });
  });

  describe('updateSession', () => {
    it('returns false when not found', async () => {
      findById.mockResolvedValue(null);
      const res = await service.updateSession('u1', 's1', { title: 'new' });
      expect(res).toBe(false);
    });

    it('returns true and calls update', async () => {
      findById.mockResolvedValue(mockSession);
      update.mockResolvedValue(undefined);
      const res = await service.updateSession('u1', 's1', { title: 'new' });
      expect(res).toBe(true);
      expect(update).toHaveBeenCalledWith('s1', { title: 'new' });
    });
  });

  describe('deleteSession', () => {
    it('returns false when not found', async () => {
      findById.mockResolvedValue(null);
      expect(await service.deleteSession('u1', 's1')).toBe(false);
    });

    it('removes and returns true', async () => {
      findById.mockResolvedValue(mockSession);
      remove.mockResolvedValue(undefined);
      expect(await service.deleteSession('u1', 's1')).toBe(true);
    });
  });

  describe('bulkInsertSegments', () => {
    it('returns false when session not found', async () => {
      findById.mockResolvedValue(null);
      expect(await service.bulkInsertSegments('u1', 's1', [])).toBe(false);
    });

    it('inserts segments and returns true', async () => {
      findById.mockResolvedValue(mockSession);
      insertSegments.mockResolvedValue(undefined);
      const segs = [{ id: 'seg1', text: 'hello', startMs: 0, endMs: 1000 }];
      expect(await service.bulkInsertSegments('u1', 's1', segs)).toBe(true);
      expect(insertSegments).toHaveBeenCalledWith('s1', segs);
    });
  });
});
