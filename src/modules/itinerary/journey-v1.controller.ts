import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RawBodyPipe } from './pipes/raw-body.pipe';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ItineraryService } from './itinerary.service';
import {
  GenerateItineraryRequestDto,
  GenerateItineraryResponseDto,
  CreateItineraryRequestDto,
  CreateItineraryFromFrontendDataDto,
  UpdateItineraryRequestDto,
  UpdateItineraryFromFrontendDataDto,
  CreateItineraryResponseDto,
  UpdateItineraryResponseDto,
  DeleteItineraryResponseDto,
  ItineraryListResponseDto,
  ItineraryDetailResponseDto,
  CreateDayDto,
  UpdateDayDto,
  CreateActivityDto,
  UpdateActivityDto,
  ReorderActivitiesDto,
  ItineraryDayDto,
  ItineraryActivityDto,
  CloneJourneyResponseDto,
  ShareJourneyRequestDto,
  ShareJourneyResponseDto,
  ExportJourneyRequestDto,
  ExportJourneyResponseDto,
  ResetJourneyRequestDto,
  ResetJourneyResponseDto,
  TaskListResponseDto,
  SyncTasksRequestDto,
  SyncTasksResponseDto,
  UpdateTaskRequestDto,
  UpdateTaskResponseDto,
  CreateTaskRequestDto,
  CreateTaskResponseDto,
  DeleteTaskResponseDto,
  PreparationProfileListResponseDto,
  PreparationProfileDetailResponseDto,
  CreatePreparationProfileRequestDto,
  CreatePreparationProfileResponseDto,
  GenerateSafetyNoticeRequestDto,
  GenerateSafetyNoticeResponseDto,
  GetSafetyNoticeResponseDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  GetExpenseListResponseDto,
  CreateExpenseResponseDto,
  UpdateExpenseResponseDto,
  DeleteExpenseResponseDto,
  BatchGetActivitiesRequestDto,
  BatchActivitiesResponseDto,
} from './dto/itinerary.dto';

@ApiTags('Journey V1')
@Controller('v1/journeys')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class JourneyV1Controller {
  private readonly logger = new Logger(JourneyV1Controller.name);
  
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post('generate')
  @ApiOperation({
    summary: '生成旅行行程',
    description: '使用 AI 根据目的地、天数、偏好等信息生成详细的旅行行程',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateJourney(
    @Body() dto: GenerateItineraryRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<GenerateItineraryResponseDto> {
    return this.itineraryService.generateItinerary(dto, user.userId);
  }

  @Get()
  @ApiOperation({
    summary: '获取行程列表',
    description: '获取用户的行程列表，支持分页和状态筛选',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getJourneyList(
    @Query('status') status?: 'draft' | 'published' | 'archived',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: { userId: string },
  ): Promise<ItineraryListResponseDto> {
    return this.itineraryService.getItineraryList(user!.userId, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @ApiOperation({
    summary: '创建行程',
    description: '创建一个新的行程，可带 templateId、用户偏好、AI 生成参数',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createJourney(
    @Body() dto: CreateItineraryRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<CreateItineraryResponseDto> {
    return this.itineraryService.createItinerary(dto, user.userId);
  }

  @Post('from-frontend-data')
  @ApiOperation({
    summary: '从前端数据格式创建行程',
    description:
      '接受前端提供的完整行程数据格式（包含 itineraryData 和 tasks），自动转换为标准格式并创建行程',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // 禁用禁止未列出的属性，允许前端传递额外字段
    }),
  )
  async createJourneyFromFrontendData(
    @Body() dto: CreateItineraryFromFrontendDataDto,
    @CurrentUser() user: { userId: string },
  ): Promise<CreateItineraryResponseDto> {
    return this.itineraryService.createItineraryFromFrontendData(dto, user.userId);
  }

  @Get(':journeyId')
  @ApiOperation({
    summary: '获取行程详情',
    description: '根据 ID 获取完整的行程详情，包含所有天数和活动信息',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getJourneyById(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<ItineraryDetailResponseDto> {
    return this.itineraryService.getItineraryById(journeyId, user.userId);
  }

  @Patch(':journeyId')
  @ApiOperation({
    summary: '更新行程元信息',
    description: '更新行程的基本信息（destination、startDate、days、summary、totalCost、preferences、status）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateJourney(
    @Param('journeyId') journeyId: string,
    @Body() dto: UpdateItineraryRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<UpdateItineraryResponseDto> {
    return this.itineraryService.updateItinerary(journeyId, dto, user.userId);
  }

  @Patch(':journeyId/from-frontend-data')
  @ApiOperation({
    summary: '从前端数据格式更新行程',
    description:
      '接受前端提供的完整行程数据格式（包含 itineraryData 和 tasks），自动转换为标准格式并更新行程，包括 days 数组的详细内容',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateJourneyFromFrontendData(
    @Param('journeyId') journeyId: string,
    @Body() dto: UpdateItineraryFromFrontendDataDto,
    @CurrentUser() user: { userId: string },
  ): Promise<UpdateItineraryResponseDto> {
    return this.itineraryService.updateItineraryFromFrontendData(journeyId, dto, user.userId);
  }

  @Delete(':journeyId')
  @ApiOperation({
    summary: '删除行程',
    description: '删除指定的行程',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteJourney(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<DeleteItineraryResponseDto> {
    return this.itineraryService.deleteItinerary(journeyId, user.userId);
  }

  // ========== 天数管理接口 ==========

  @Get(':journeyId/days')
  @ApiOperation({
    summary: '获取行程的所有天数',
    description: '获取指定行程的所有天数及其活动信息',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getJourneyDays(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<Array<ItineraryDayDto & { id: string }>> {
    return this.itineraryService.getJourneyDays(journeyId, user.userId);
  }

  @Post(':journeyId/days')
  @ApiOperation({
    summary: '为行程添加天数（支持单个或批量）',
    description: '为指定行程添加天数。支持单个对象、数组或包装格式。单个对象格式：{day: 1, date: "2025-11-25"}，数组格式：[{day: 1, date: "2025-11-25"}, ...]，包装格式：{days: [{day: 1, date: "2025-11-25"}, ...]}',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RawBodyPipe())
  async createJourneyDay(
    @Param('journeyId') journeyId: string,
    @Body(new RawBodyPipe()) body: any,
    @CurrentUser() user: { userId: string },
  ): Promise<
    | (ItineraryDayDto & { id: string })
    | Array<ItineraryDayDto & { id: string }>
  > {
    // 添加日志以便调试
    this.logger.debug(`收到创建天数请求: journeyId=${journeyId}, body type=${typeof body}, isArray=${Array.isArray(body)}`);
    this.logger.debug(`请求体内容: ${JSON.stringify(body)}`);
    
    // 智能识别输入格式
    let daysData: Array<{
      day: number;
      date: string;
      activities?: Array<{
        time: string;
        title: string;
        type: string;
        duration: number;
        location: { lat: number; lng: number };
        notes?: string;
        cost?: number;
      }>;
    }> = [];

    if (Array.isArray(body)) {
      // 数组格式：[{day: 1, date: "2025-11-25", activities: [...]}, ...]
      // 或 [{day: 1, date: "2025-11-25", timeSlots: [...]}, ...]
      daysData = body.map((item) => {
        // 支持 timeSlots 和 activities 两种字段名
        const activitiesData = item.activities || item.timeSlots || undefined;
        
        // 转换activities格式，处理字段名映射
        const activities = activitiesData
          ? activitiesData.map((slot: any) => ({
              time: slot.time || slot.startTime,
              title: slot.title || slot.activity || '',
              type: slot.type || 'attraction',
              duration: slot.duration || slot.durationMinutes || 60,
              location: slot.location || slot.coordinates || { lat: 0, lng: 0 },
              notes: slot.notes || slot.description || '',
              cost: slot.cost || 0,
            }))
          : undefined;

        return {
          day: item.day,
          date: item.date,
          activities,
        };
      });
    } else if (typeof body === 'object' && body !== null) {
      const bodyObj = body as Record<string, unknown>;
      if ('days' in bodyObj && Array.isArray(bodyObj.days)) {
        // 包装格式：{days: [{day: 1, date: "2025-11-25", activities: [...]}, ...]}
        // 或 {days: [{day: 1, date: "2025-11-25", timeSlots: [...]}, ...]}
        daysData = (bodyObj.days as Array<Record<string, unknown>>).map(
          (item) => {
            const activitiesData = item.activities || item.timeSlots || undefined;
            const activities = activitiesData
              ? (activitiesData as Array<any>).map((slot: any) => ({
                  time: slot.time || slot.startTime,
                  title: slot.title || slot.activity || '',
                  type: slot.type || 'attraction',
                  duration: slot.duration || slot.durationMinutes || 60,
                  location: slot.location || slot.coordinates || { lat: 0, lng: 0 },
                  notes: slot.notes || slot.description || '',
                  cost: slot.cost || 0,
                }))
              : undefined;

            return {
              day: item.day as number,
              date: item.date as string,
              activities,
            };
          },
        );
      } else if ('day' in bodyObj && 'date' in bodyObj) {
        // 单个对象格式：{day: 1, date: "2025-11-25", activities: [...]}
        // 或 {day: 1, date: "2025-11-25", timeSlots: [...]}
        const activitiesData = bodyObj.activities || bodyObj.timeSlots || undefined;
        const activities = activitiesData
          ? (activitiesData as Array<any>).map((slot: any) => ({
              time: slot.time || slot.startTime,
              title: slot.title || slot.activity || '',
              type: slot.type || 'attraction',
              duration: slot.duration || slot.durationMinutes || 60,
              location: slot.location || slot.coordinates || { lat: 0, lng: 0 },
              notes: slot.notes || slot.description || '',
              cost: slot.cost || 0,
            }))
          : undefined;

        daysData = [
          {
            day: bodyObj.day as number,
            date: bodyObj.date as string,
            activities,
          },
        ];
      } else {
        this.logger.warn(`无效的请求格式: ${JSON.stringify(body)}`);
        throw new BadRequestException(
          `无效的请求格式。请使用单个对象 {day: 1, date: "2025-11-25"}、数组格式 [{day: 1, date: "2025-11-25"}, ...] 或包装格式 {days: [{day: 1, date: "2025-11-25"}, ...]}`,
        );
      }
    } else {
      this.logger.warn(`请求体类型不正确: ${typeof body}, value: ${JSON.stringify(body)}`);
      throw new BadRequestException('请求体必须是对象或数组');
    }

    // 验证数据
    this.logger.debug(`解析后的天数数据: ${daysData.length} 个天数`);
    if (daysData.length === 0) {
      throw new BadRequestException('至少需要提供一个天数数据');
    }

    // 验证每个天数的格式
    for (let i = 0; i < daysData.length; i++) {
      const dayData = daysData[i];
      if (typeof dayData.day !== 'number' || dayData.day < 1) {
        throw new BadRequestException(
          `第${i + 1}个天数数据格式不正确：day必须是大于等于1的数字`,
        );
      }
      if (typeof dayData.date !== 'string' || !dayData.date) {
        throw new BadRequestException(
          `第${i + 1}个天数数据格式不正确：date必须是有效的日期字符串`,
        );
      }
      // 验证日期格式（ISO 8601格式：YYYY-MM-DD）
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dayData.date)) {
        throw new BadRequestException(
          `第${i + 1}个天数数据格式不正确：date必须是YYYY-MM-DD格式的日期字符串`,
        );
      }
      // 验证日期是否有效
      const dateObj = new Date(dayData.date);
      if (isNaN(dateObj.getTime())) {
        throw new BadRequestException(
          `第${i + 1}个天数数据格式不正确：date必须是有效的日期`,
        );
      }
    }

    // 如果是单个，返回单个结果；如果是多个，返回数组
    if (daysData.length === 1) {
      return this.itineraryService.createJourneyDay(
        journeyId,
        daysData[0],
        user.userId,
      );
    } else {
      return this.itineraryService.createJourneyDays(
        journeyId,
        daysData,
        user.userId,
      );
    }
  }

  @Patch(':journeyId/days/:dayId')
  @ApiOperation({
    summary: '更新指定天数',
    description: '更新指定天数的信息（day、date）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateJourneyDay(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateDayDto,
    @CurrentUser() user: { userId: string },
  ): Promise<ItineraryDayDto & { id: string }> {
    return this.itineraryService.updateJourneyDay(journeyId, dayId, dto, user.userId);
  }

  @Delete(':journeyId/days/:dayId')
  @ApiOperation({
    summary: '删除指定天数',
    description: '删除指定的天数（会级联删除该天的所有活动）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteJourneyDay(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<{ success: boolean; message?: string }> {
    return this.itineraryService.deleteJourneyDay(journeyId, dayId, user.userId);
  }

  // ========== 活动管理接口 ==========

  @Get(':journeyId/days/:dayId/slots')
  @ApiOperation({
    summary: '获取指定天数的所有时间段',
    description: '获取指定天数的所有活动（时间段）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getJourneyDayActivities(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<Array<ItineraryActivityDto & { id: string }>> {
    return this.itineraryService.getJourneyDayActivities(journeyId, dayId, user.userId);
  }

  @Post(':journeyId/activities/batch')
  @ApiOperation({
    summary: '批量获取多个天数的活动详情',
    description:
      '批量获取指定行程中多个天数的所有活动详情。如果不提供 dayIds，则返回整个行程所有天的活动。',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async batchGetJourneyActivities(
    @Param('journeyId') journeyId: string,
    @Body() dto: BatchGetActivitiesRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<BatchActivitiesResponseDto> {
    const result = await this.itineraryService.batchGetJourneyActivities(
      journeyId,
      dto.dayIds,
      user.userId,
    );
    return {
      activities: result.activities,
      totalCount: result.totalCount,
    };
  }

  @Post(':journeyId/days/:dayId/slots')
  @ApiOperation({
    summary: '为指定天数添加时间段',
    description: '为指定天数添加一个新的活动（时间段）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createJourneyDayActivity(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: { userId: string },
  ): Promise<ItineraryActivityDto & { id: string }> {
    return this.itineraryService.createJourneyDayActivity(journeyId, dayId, dto, user.userId);
  }

  @Patch(':journeyId/days/:dayId/slots/:slotId')
  @ApiOperation({
    summary: '更新指定时间段',
    description: '更新指定活动（时间段）的信息',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateJourneyDayActivity(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: { userId: string },
  ): Promise<ItineraryActivityDto & { id: string }> {
    return this.itineraryService.updateJourneyDayActivity(
      journeyId,
      dayId,
      slotId,
      dto,
      user.userId,
    );
  }

  @Delete(':journeyId/days/:dayId/slots/:slotId')
  @ApiOperation({
    summary: '删除指定时间段',
    description: '删除指定的活动（时间段）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteJourneyDayActivity(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<{ success: boolean; message?: string }> {
    return this.itineraryService.deleteJourneyDayActivity(journeyId, dayId, slotId, user.userId);
  }

  @Post(':journeyId/days/:dayId/slots/reorder')
  @ApiOperation({
    summary: '重新排序时间段',
    description: '根据提供的活动 ID 列表重新排序指定天数的活动',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async reorderJourneyDayActivities(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Body() dto: ReorderActivitiesDto,
    @CurrentUser() user: { userId: string },
  ): Promise<Array<ItineraryActivityDto & { id: string }>> {
    return this.itineraryService.reorderJourneyDayActivities(journeyId, dayId, dto, user.userId);
  }

  // ========== 扩展功能接口 ==========

  @Post(':journeyId/clone')
  @ApiOperation({
    summary: '复制行程',
    description: '复制指定的行程，创建一个新的草稿行程',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async cloneJourney(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<CloneJourneyResponseDto> {
    return this.itineraryService.cloneJourney(journeyId, user.userId);
  }

  @Post(':journeyId/share')
  @ApiOperation({
    summary: '分享行程',
    description: '生成行程分享链接和分享码',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async shareJourney(
    @Param('journeyId') journeyId: string,
    @Body() dto: ShareJourneyRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<ShareJourneyResponseDto> {
    return this.itineraryService.shareJourney(journeyId, user.userId, dto);
  }

  @Post(':journeyId/export')
  @ApiOperation({
    summary: '导出行程',
    description: '将行程导出为 PDF、ICS 或 JSON 格式',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async exportJourney(
    @Param('journeyId') journeyId: string,
    @Body() dto: ExportJourneyRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<ExportJourneyResponseDto> {
    return this.itineraryService.exportJourney(journeyId, user.userId, dto);
  }

  @Post(':journeyId/reset')
  @ApiOperation({
    summary: '重置行程',
    description: '将行程重置为初始状态（可保留历史版本）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async resetJourney(
    @Param('journeyId') journeyId: string,
    @Body() dto: ResetJourneyRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<ResetJourneyResponseDto> {
    return this.itineraryService.resetJourney(journeyId, user.userId, dto);
  }

  // ========== 任务管理接口 ==========

  @Get(':journeyId/tasks')
  @ApiOperation({
    summary: '查看行程准备任务',
    description: '获取指定行程的所有准备任务',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getJourneyTasks(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<TaskListResponseDto> {
    return this.itineraryService.getJourneyTasks(journeyId, user.userId);
  }

  @Post(':journeyId/tasks/sync')
  @ApiOperation({
    summary: '同步任务',
    description: '根据目的地/模板重新生成并合并任务',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async syncJourneyTasks(
    @Param('journeyId') journeyId: string,
    @Body() dto: SyncTasksRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<SyncTasksResponseDto> {
    return this.itineraryService.syncJourneyTasks(journeyId, user.userId, dto);
  }

  @Patch(':journeyId/tasks/:taskId')
  @ApiOperation({
    summary: '修改任务',
    description: '修改任务的完成状态、标题、链接等信息',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateJourneyTask(
    @Param('journeyId') journeyId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<UpdateTaskResponseDto> {
    return this.itineraryService.updateJourneyTask(journeyId, taskId, user.userId, dto);
  }

  @Delete(':journeyId/tasks/:taskId')
  @ApiOperation({
    summary: '删除任务',
    description: '删除指定的任务',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteJourneyTask(
    @Param('journeyId') journeyId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<DeleteTaskResponseDto> {
    return this.itineraryService.deleteJourneyTask(journeyId, taskId, user.userId);
  }

  @Post(':journeyId/tasks')
  @ApiOperation({
    summary: '新增自定义任务',
    description: '为行程添加一个自定义任务',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createJourneyTask(
    @Param('journeyId') journeyId: string,
    @Body() dto: CreateTaskRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<CreateTaskResponseDto> {
    return this.itineraryService.createJourneyTask(journeyId, user.userId, dto);
  }

  // ========== 准备任务模板管理接口 ==========

  @Get('preparation-profiles')
  @ApiOperation({
    summary: '获取准备任务模板列表',
    description: '获取所有准备任务模板（后台维护）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPreparationProfiles(): Promise<PreparationProfileListResponseDto> {
    return this.itineraryService.getPreparationProfiles();
  }

  @Get('preparation-profiles/:id')
  @ApiOperation({
    summary: '获取准备任务模板详情',
    description: '根据ID获取准备任务模板的详细信息',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPreparationProfileById(
    @Param('id') id: string,
  ): Promise<PreparationProfileDetailResponseDto> {
    return this.itineraryService.getPreparationProfileById(id);
  }

  @Post('preparation-profiles')
  @ApiOperation({
    summary: '创建任务模板',
    description: '创建新的准备任务模板（仅管理员）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createPreparationProfile(
    @Body() dto: CreatePreparationProfileRequestDto,
  ): Promise<CreatePreparationProfileResponseDto> {
    return this.itineraryService.createPreparationProfile(dto);
  }

  @Post(':journeyId/safety-notice')
  @ApiOperation({
    summary: '生成安全提示',
    description: '为行程生成/刷新安全提示（调用 AI + 缓存）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateSafetyNotice(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: GenerateSafetyNoticeRequestDto,
  ): Promise<GenerateSafetyNoticeResponseDto> {
    return this.itineraryService.generateSafetyNotice(journeyId, user.userId, dto);
  }

  @Get(':journeyId/safety-notice')
  @ApiOperation({
    summary: '获取安全提示',
    description: '获取当前行程的安全提示内容',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getSafetyNotice(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<GetSafetyNoticeResponseDto> {
    return this.itineraryService.getSafetyNotice(journeyId, user.userId);
  }

  // ==================== 支出管理接口 ====================

  @Get(':journeyId/expenses')
  @ApiOperation({
    summary: '获取支出列表',
    description: '获取行程的所有支出记录，支持按分类、日期、付款人筛选',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getExpenses(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('payerId') payerId?: string,
  ): Promise<GetExpenseListResponseDto> {
    return this.itineraryService.getExpenses(
      journeyId,
      user.userId,
      {
        category,
        startDate,
        endDate,
        payerId,
      },
    );
  }

  @Post(':journeyId/expenses')
  @ApiOperation({
    summary: '创建支出',
    description: '为行程添加新的支出记录',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createExpense(
    @Param('journeyId') journeyId: string,
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: { userId: string },
  ): Promise<CreateExpenseResponseDto> {
    return this.itineraryService.createExpense(journeyId, dto, user.userId);
  }

  @Patch(':journeyId/expenses/:expenseId')
  @ApiOperation({
    summary: '更新支出',
    description: '更新指定的支出记录',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateExpense(
    @Param('journeyId') journeyId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: { userId: string },
  ): Promise<UpdateExpenseResponseDto> {
    return this.itineraryService.updateExpense(journeyId, expenseId, dto, user.userId);
  }

  @Delete(':journeyId/expenses/:expenseId')
  @ApiOperation({
    summary: '删除支出',
    description: '删除指定的支出记录',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteExpense(
    @Param('journeyId') journeyId: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<DeleteExpenseResponseDto> {
    return this.itineraryService.deleteExpense(journeyId, expenseId, user.userId);
  }
}

