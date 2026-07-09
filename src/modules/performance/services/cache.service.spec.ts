import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    service = new CacheService(10 * 1024 * 1024, 1000); // 10MB, 1s TTL
  });

  afterEach(() => {
    service.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Basic Operations', () => {
    it('should set and get value', () => {
      service.set('key', { data: 'value' });
      const result = service.get('key');
      expect(result).toEqual({ data: 'value' });
    });

    it('should return undefined for missing key', () => {
      const result = service.get('missing');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', () => {
      service.set('key', 'value');
      expect(service.has('key')).toBe(true);
      expect(service.has('missing')).toBe(false);
    });

    it('should delete key', () => {
      service.set('key', 'value');
      expect(service.delete('key')).toBe(true);
      expect(service.get('key')).toBeUndefined();
    });

    it('should clear all entries', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.clear();
      expect(service.get('key1')).toBeUndefined();
      expect(service.get('key2')).toBeUndefined();
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', (done) => {
      service.set('key', 'value', 100);
      expect(service.get('key')).toBe('value');

      setTimeout(() => {
        expect(service.get('key')).toBeUndefined();
        done();
      }, 200);
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      const result = service.getMany(['key1', 'key2', 'missing']);
      expect(result.size).toBe(2);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
    });

    it('should set multiple values', () => {
      service.setMany([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);

      expect(service.get('key1')).toBe('value1');
      expect(service.get('key2')).toBe('value2');
    });
  });

  describe('Pattern Matching', () => {
    it('should get keys matching pattern', () => {
      service.set('circuit:123', {});
      service.set('circuit:456', {});
      service.set('other:key', {});

      const keys = service.keys(/^circuit:/);
      expect(keys).toContain('circuit:123');
      expect(keys).toContain('circuit:456');
      expect(keys).not.toContain('other:key');
    });

    it('should invalidate by pattern', () => {
      service.set('circuit:123', {});
      service.set('circuit:456', {});
      service.set('other:key', {});

      const count = service.invalidatePattern(/^circuit:/);
      expect(count).toBe(2);
      expect(service.has('circuit:123')).toBe(false);
      expect(service.has('other:key')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      service.get('key1'); // hit
      service.get('key1'); // hit
      service.get('missing'); // miss

      const stats = service.getStats();
      expect(stats.entryCount).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(2 / 3);
    });
  });

  describe('Prefetch', () => {
    it('should prefetch values', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched');
      await service.prefetch(['key1', 'key2'], fetcher);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(service.get('key1')).toBe('fetched');
    });

    it('should not fetch existing keys', async () => {
      service.set('key1', 'existing');
      const fetcher = jest.fn().mockResolvedValue('fetched');

      await service.prefetch(['key1', 'key2'], fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(service.get('key1')).toBe('existing');
    });
  });
});
