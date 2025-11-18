import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskQueueService } from './services/task-queue.service';
import { TaskType } from './dto/task.dto';

const mockTaskQueueService = {
  getQueueStatuses: jest.fn(),
  scheduleTask: jest.fn(),
  simulateProcessing: jest.fn(),
};

describe('TaskController', () => {
  let controller: TaskController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskQueueService,
          useValue: mockTaskQueueService,
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns queue statuses', () => {
    const statuses = [
      { name: TaskType.CatalogSync, waiting: 1, active: 0, failed: 0 },
    ];
    mockTaskQueueService.getQueueStatuses.mockReturnValue(statuses);

    expect(controller.getQueues()).toEqual(statuses);
  });

  it('schedules a task', async () => {
    mockTaskQueueService.scheduleTask.mockResolvedValue({ status: 'queued' });

    await expect(
      controller.scheduleTask({ task: TaskType.CatalogSync }),
    ).resolves.toEqual({
      status: 'queued',
    });
    expect(mockTaskQueueService.scheduleTask).toHaveBeenCalledWith({
      task: TaskType.CatalogSync,
    });
  });

  it('simulates processing', async () => {
    mockTaskQueueService.simulateProcessing.mockResolvedValue(undefined);

    await expect(controller.simulateProcessing()).resolves.toEqual({
      status: 'ok',
    });
    expect(mockTaskQueueService.simulateProcessing).toHaveBeenCalled();
  });
});
