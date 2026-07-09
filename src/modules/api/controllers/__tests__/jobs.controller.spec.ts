/**
 * Jobs Controller Tests
 *
 * Tests for jobs REST API endpoints
 */

import { JobsController } from '../jobs.controller';

describe('JobsController', () => {
  let controller: JobsController;

  beforeEach(() => {
    controller = new JobsController();
  });

  describe('listJobs', () => {
    it('should return list of jobs', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.listJobs(req, undefined, 1, 20);

      expect(result).toHaveProperty('jobs');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
    });

    it('should filter by status', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.listJobs(req, 'running', 1, 20);

      expect(result.filter).toHaveProperty('status', 'running');
    });

    it('should support custom pagination', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.listJobs(req, undefined, 2, 50);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(50);
    });
  });

  describe('getJob', () => {
    it('should return job details', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getJob('job-123', req);

      expect(result).toHaveProperty('id', 'job-123');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getJobStatus('job-123', req);

      expect(result).toHaveProperty('id', 'job-123');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
    });
  });

  describe('getJobLogs', () => {
    it('should return job logs', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getJobLogs('job-123', 100, req);

      expect(result).toHaveProperty('id', 'job-123');
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('lines', 100);
    });

    it('should support custom line count', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getJobLogs('job-123', 500, req);

      expect(result.lines).toBe(500);
    });
  });

  describe('cancelJob', () => {
    it('should cancel job', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.cancelJob('job-123', req);

      expect(result).toHaveProperty('id', 'job-123');
      expect(result).toHaveProperty('cancelled', true);
      expect(result).toHaveProperty('message');
    });
  });

  describe('retryJob', () => {
    it('should retry failed job', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.retryJob('job-123', req);

      expect(result).toHaveProperty('id', 'job-123');
      expect(result).toHaveProperty('newJobId');
      expect(result).toHaveProperty('status', 'queued');
      expect(result.newJobId).toContain('retry');
    });
  });
});
