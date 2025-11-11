import { Injectable, Logger } from '@nestjs/common';
import { ScheduleTaskDto, TaskType } from '../dto/task.dto';

interface QueueState {
  waiting: number;
  active: number;
  failed: number;
}

@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);
  private readonly queues: Record<TaskType, QueueState> = {
    [TaskType.JourneyGeneration]: { waiting: 0, active: 0, failed: 0 },
    [TaskType.CatalogSync]: { waiting: 0, active: 0, failed: 0 },
    [TaskType.GuidesCacheRefresh]: { waiting: 0, active: 0, failed: 0 },
  };

  scheduleTask(dto: ScheduleTaskDto): { status: 'queued' } {
    this.logger.log(
      `Queueing task ${dto.task} with context ${dto.contextId ?? 'n/a'}`,
    );
    const queue = this.queues[dto.task];
    queue.waiting += 1;
    return { status: 'queued' };
  }

  simulateProcessing(): void {
    Object.values(this.queues).forEach((queue) => {
      if (queue.waiting > 0) {
        queue.waiting -= 1;
        queue.active += 1;
      } else if (queue.active > 0) {
        queue.active -= 1;
      }
    });
  }

  getQueueStatuses(): Array<{
    name: TaskType;
    waiting: number;
    active: number;
    failed: number;
  }> {
    return Object.entries(this.queues).map(([name, state]) => ({
      name: name as TaskType,
      ...state,
    }));
  }
}
