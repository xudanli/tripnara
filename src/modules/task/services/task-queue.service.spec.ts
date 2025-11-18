import { Test, TestingModule } from '@nestjs/testing';
import { TaskQueueService } from './task-queue.service';
import { TaskType } from '../dto/task.dto';

describe('TaskQueueService', () => {
  let service: TaskQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskQueueService],
    }).compile();

    service = module.get<TaskQueueService>(TaskQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('queues tasks and updates waiting count', async () => {
    await service.scheduleTask({ task: TaskType.GuidesCacheRefresh });
    const statuses = service.getQueueStatuses();
    const queue = statuses.find(
      (status) => status.name === TaskType.GuidesCacheRefresh,
    );

    expect(queue?.waiting).toBe(1);
  });

  it('simulates processing and decreases waiting jobs', async () => {
    await service.scheduleTask({ task: TaskType.CatalogSync });
    await service.simulateProcessing();
    const statuses = service.getQueueStatuses();
    const queue = statuses.find(
      (status) => status.name === TaskType.CatalogSync,
    );

    expect(queue?.waiting).toBe(0);
  });
});
