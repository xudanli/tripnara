import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobStatusDto {
  @ApiProperty({ description: '任务ID', example: 'job-123' })
  id!: string;

  @ApiProperty({
    description: '任务状态',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'not_found'],
    example: 'completed',
  })
  status!: string;

  @ApiPropertyOptional({ description: '任务进度（0-100）', example: 100 })
  progress?: number;

  @ApiPropertyOptional({ description: '任务结果' })
  result?: any;

  @ApiPropertyOptional({ description: '错误信息' })
  error?: string;

  @ApiPropertyOptional({ description: '任务数据' })
  data?: any;
}

export class EnqueueLocationGenerationResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '任务ID', example: 'job-123' })
  jobId!: string;
}

export class GetJobStatusResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '任务状态', type: JobStatusDto })
  data!: JobStatusDto;
}

