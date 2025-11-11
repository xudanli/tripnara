import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueueStatusDto, ScheduleTaskDto } from './dto/task.dto';
import { TaskQueueService } from './services/task-queue.service';

@ApiTags('Task')
@Controller('task')
export class TaskController {
  constructor(private readonly taskQueueService: TaskQueueService) {}

  @Get('queues')
  @ApiOperation({
    summary: 'Retrieve BullMQ queue status for asynchronous workers.',
  })
  @ApiOkResponse({ type: [QueueStatusDto] })
  getQueues(): QueueStatusDto[] {
    return this.taskQueueService.getQueueStatuses() as QueueStatusDto[];
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a new asynchronous task.' })
  @ApiOkResponse({ schema: { example: { status: 'queued' } } })
  scheduleTask(@Body() dto: ScheduleTaskDto): { status: 'queued' } {
    return this.taskQueueService.scheduleTask(dto);
  }

  @Post('simulate-processing')
  @ApiOperation({ summary: 'Simulate task processing (development helper).' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  simulateProcessing(): { status: 'ok' } {
    this.taskQueueService.simulateProcessing();
    return { status: 'ok' };
  }
}
