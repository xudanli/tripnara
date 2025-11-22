import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalService } from './external.service';
import {
  EventSearchQueryDto,
  LocationSearchQueryDto,
  AttractionDetailsParamDto,
  AttractionDetailsQueryDto,
  AttractionDetailsResponseDto,
} from './dto/external.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('External Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @Get('events')
  @ApiOperation({ summary: '搜索 Eventbrite 活动' })
  async searchEvents(@Query() query: EventSearchQueryDto) {
    const data = await this.externalService.searchEvents(query.location);
    return { data };
  }

  @Get('locations')
  @ApiOperation({ summary: '搜索 Travel Advisor 目的地' })
  async searchLocations(@Query() query: LocationSearchQueryDto) {
    const data = await this.externalService.searchLocations(query.query);
    return { data };
  }

  @Get('attractions/:id')
  @ApiOperation({
    summary: '获取 TripAdvisor 景点详情',
    description: '获取景点的门票价格区间、票务信息、评分等信息，用于"费用详情"卡片',
  })
  async getAttractionDetails(
    @Param() param: AttractionDetailsParamDto,
    @Query() query: AttractionDetailsQueryDto,
  ): Promise<AttractionDetailsResponseDto> {
    const data = await this.externalService.getAttractionDetails(
      param.id,
      query.lang || 'zh-CN',
    );
    return {
      success: true,
      data,
    };
  }
}

