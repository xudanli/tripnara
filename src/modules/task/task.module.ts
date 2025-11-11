import { Module } from '@nestjs/common';
import { TaskQueueService } from './services/task-queue.service';
import { TaskController } from './task.controller';

@Module({
  providers: [TaskQueueService],
  controllers: [TaskController],
  exports: [TaskQueueService],
})
export class TaskModule {}
