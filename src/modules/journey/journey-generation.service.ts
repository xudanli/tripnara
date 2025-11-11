// path: src/modules/journey/journey-generation.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AiGenerationJobEntity,
  AiRequestLogEntity,
} from '../persistence/entities/ai-log.entity';
import { JourneyRepository } from '../persistence/repositories/journey/journey.repository';
import { LlmService } from '../llm/llm.service';
import {
  JOURNEY_GENERATION_STAGES,
  JourneyGenerationRequestDto,
  JourneyGenerationResultDto,
  JourneyGenerationStage,
  JourneyGenerationStageRequestDto,
  JourneyGenerationStatusResponseDto,
} from './dto/journey-generation.dto';
import { JourneyEntity } from '../persistence/entities/journey.entity';

type Provider = 'deepseek' | 'openai';
type JobStatus = 'running' | 'completed' | 'failed' | 'none';

const BASE_PROMPTS: Record<JourneyGenerationStage, string> = {
  framework:
    '请为目的地 ${destination} 生成一个行程框架，包含旅程主题和整体节奏。',
  dayDetails: '为 ${destination} 的行程提供详细的每日安排，强调体验与节奏。',
  transport:
    '为 ${destination} 的行程推荐交通方案，包含城市内和城市间的主要移动方式。',
  scenicIntro: '写一段吸引人的 ${destination} 风景介绍，突出自然与人文特点。',
  tips: '提供 ${destination} 的旅行建议，包括餐饮、文化礼仪、必备物品等。',
  safetyNotice: '生成 ${destination} 的安全提示，提醒注意事项和应急建议。',
};

@Injectable()
export class JourneyGenerationService {
  constructor(
    private readonly journeyRepository: JourneyRepository,
    @InjectRepository(AiGenerationJobEntity)
    private readonly jobRepository: Repository<AiGenerationJobEntity>,
    @InjectRepository(AiRequestLogEntity)
    private readonly logRepository: Repository<AiRequestLogEntity>,
    private readonly llmService: LlmService,
    private readonly dataSource: DataSource,
  ) {}

  async startGeneration(
    journeyId: string,
    dto: JourneyGenerationRequestDto,
  ): Promise<JourneyGenerationResultDto> {
    const journey = await this.findJourneyOrFail(journeyId);
    const stages = this.normalizeStages(dto.stages);
    await this.ensureNoConcurrentRun(journeyId);

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        journeyId,
        status: 'running',
        // 关键：实体上可选字段用 undefined，不要传 null
        errorMessage: undefined,
        completedAt: undefined,
      }),
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        for (const stage of stages) {
          await this.executeStage(
            manager.getRepository(AiRequestLogEntity),
            journey,
            stage,
            dto.provider ?? 'deepseek',
            dto.extra,
          );
        }
      });

      job.status = 'completed';
      job.completedAt = new Date();
      await this.jobRepository.save(job);
    } catch (error: unknown) {
      await this.handleGenerationFailure(job, error);
    }

    return { jobId: job.id, stages };
  }

  async executeSingleStage(
    journeyId: string,
    stage: JourneyGenerationStage,
    dto: JourneyGenerationStageRequestDto,
  ): Promise<JourneyGenerationResultDto> {
    const journey = await this.findJourneyOrFail(journeyId);
    await this.ensureNoConcurrentRun(journeyId);

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        journeyId,
        status: 'running',
        errorMessage: undefined,
        completedAt: undefined,
      }),
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.executeStage(
          manager.getRepository(AiRequestLogEntity),
          journey,
          stage,
          dto.provider ?? 'deepseek',
          { prompt: dto.prompt },
        );
      });

      job.status = 'completed';
      job.completedAt = new Date();
      await this.jobRepository.save(job);
    } catch (error: unknown) {
      await this.handleGenerationFailure(job, error);
    }

    return { jobId: job.id, stages: [stage] };
  }

  async getStatus(
    journeyId: string,
  ): Promise<JourneyGenerationStatusResponseDto> {
    await this.findJourneyOrFail(journeyId);

    const job = await this.jobRepository.findOne({
      where: { journeyId },
      order: { startedAt: 'DESC' },
    });

    if (!job) {
      return {
        job: {
          status: 'none',
          startedAt: new Date(0),
          completedAt: null,
          errorMessage: null,
        },
        stages: [],
      };
    }

    const stages = await this.logRepository.find({
      select: ['module'],
      where: { journeyId },
      order: { createdAt: 'ASC' },
    });

    return {
      job: {
        status: job.status as JobStatus,
        startedAt: job.startedAt,
        completedAt: job.completedAt ?? null,
        errorMessage: job.errorMessage ?? null,
      },
      stages: stages.map((l) => l.module),
    };
  }

  async listLogs(journeyId: string) {
    await this.findJourneyOrFail(journeyId);
    return this.logRepository.find({
      where: { journeyId },
      order: { createdAt: 'DESC' },
    });
  }

  // ---- Internals ----

  private async ensureNoConcurrentRun(journeyId: string): Promise<void> {
    const running = await this.jobRepository.findOne({
      where: { journeyId, status: 'running' },
    });
    if (running) {
      // why: 避免同一行程并发写
      throw new ConflictException('该行程已有生成任务运行中');
    }
  }

  private normalizeStages(
    input?: JourneyGenerationStage[],
  ): JourneyGenerationStage[] {
    if (input?.length) {
      const seen = new Set<JourneyGenerationStage>();
      return input.filter((s) => {
        if (!JOURNEY_GENERATION_STAGES.includes(s)) return false;
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });
    }
    return [...JOURNEY_GENERATION_STAGES];
  }

  private async findJourneyOrFail(journeyId: string): Promise<JourneyEntity> {
    const journey = await this.journeyRepository.findById(journeyId);
    if (!journey) throw new NotFoundException('行程不存在');
    return journey;
  }

  private async executeStage(
    logRepo: Repository<AiRequestLogEntity>,
    journey: JourneyEntity,
    stage: JourneyGenerationStage,
    provider: Provider,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const prompt = this.buildPrompt(journey, stage, extra);

    let responseText = '';
    let status: 'success' | 'failure' = 'success';
    let errorMessage: string | undefined;

    try {
      responseText = await this.llmService.chatCompletion({
        provider,
        messages: [
          { role: 'system', content: 'You are an expert travel planner.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });

      await this.applyStageResult(journey, stage, responseText);
    } catch (e: unknown) {
      status = 'failure';
      errorMessage = this.formatUnknownError(e);
    } finally {
      await logRepo.save(
        logRepo.create({
          journeyId: journey.id,
          module: stage,
          status,
          // 关键：可选字段统一用 undefined，不要传 null
          promptJson: this.safeExtra({ prompt, extra }),
          responseRaw:
            status === 'success' ? { text: responseText } : undefined,
          errorMessage,
        }),
      );
    }

    if (status === 'failure') {
      throw new Error(errorMessage ?? 'Stage execution failed');
    }
  }

  private buildPrompt(
    journey: JourneyEntity,
    stage: JourneyGenerationStage,
    extra?: Record<string, unknown>,
  ): string {
    const destination =
      typeof (journey.destination ?? journey.title) === 'string'
        ? (journey.destination ?? journey.title)!
        : '目的地';

    const base = BASE_PROMPTS[stage].replace('${destination}', destination);

    const userExtra =
      extra && typeof extra === 'object'
        ? (extra as { prompt?: unknown }).prompt
        : undefined;

    const extraText =
      typeof userExtra === 'string' && userExtra.trim().length > 0
        ? `\n附加说明：${userExtra.trim()}`
        : '';

    return `${base}${extraText}`;
  }

  private async applyStageResult(
    journey: JourneyEntity,
    stage: JourneyGenerationStage,
    text: string,
  ): Promise<void> {
    const existingSources = (journey.sources as Record<string, unknown>) ?? {};

    const aiSources = {
      ...(existingSources.ai as Record<string, unknown> | undefined),
      [stage]: text,
    };

    const updatedSummary =
      stage === 'framework' ? text.slice(0, 300) : journey.summary;

    await this.journeyRepository.updateJourney(journey.id, {
      sources: {
        ...existingSources,
        ai: aiSources,
      },
      summary: updatedSummary,
    });

    journey.sources = {
      ...existingSources,
      ai: aiSources,
    } as Record<string, unknown>;
    if (updatedSummary) journey.summary = updatedSummary;
  }

  private async markJobFailed(
    job: AiGenerationJobEntity,
    error: Error,
  ): Promise<void> {
    job.status = 'failed';
    job.errorMessage = error.message;
    job.completedAt = new Date();
    await this.jobRepository.save(job);
  }

  private formatUnknownError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error during AI generation';
    }
  }

  private safeExtra(extra?: Record<string, unknown>): Record<string, unknown> {
    try {
      return JSON.parse(JSON.stringify(extra ?? {})) as Record<string, unknown>;
    } catch {
      // why: 避免循环引用导致日志失败
      return { note: 'extra serialization failed' };
    }
  }

  private async handleGenerationFailure(
    job: AiGenerationJobEntity,
    error: unknown,
  ): Promise<never> {
    const normalized =
      error instanceof Error
        ? error
        : new Error(this.formatUnknownError(error));
    await this.markJobFailed(job, normalized);
    throw normalized;
  }
}
