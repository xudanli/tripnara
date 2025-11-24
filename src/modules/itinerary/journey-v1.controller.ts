import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ItineraryService } from './itinerary.service';
import {
  CreateItineraryRequestDto,
  CreateItineraryFromFrontendDataDto,
  UpdateItineraryRequestDto,
  UpdateItineraryFromFrontendDataDto,
  CreateItineraryResponseDto,
  UpdateItineraryResponseDto,
  DeleteItineraryResponseDto,
  ItineraryListResponseDto,
  ItineraryDetailResponseDto,
} from './dto/itinerary.dto';

@ApiTags('Journey V1')
@Controller('v1/journeys')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class JourneyV1Controller {
  constructor(private readonly itineraryService: ItineraryService) {}

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
}

