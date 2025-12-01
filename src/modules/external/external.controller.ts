import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ExternalService } from './external.service';
import {
  LocationSearchQueryDto,
  AttractionDetailsParamDto,
  AttractionDetailsQueryDto,
  AttractionDetailsResponseDto,
  LocationSearchResponseDto,
} from './dto/external.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('External Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @Get('locations')
  @ApiOperation({ 
    summary: '搜索 Travel Advisor 目的地',
    description: '根据关键字搜索 Travel Advisor 目的地，返回匹配的地点列表（包含坐标、名称等信息）'
  })
  @ApiOkResponse({ 
    description: '返回 Travel Advisor 目的地列表',
    type: LocationSearchResponseDto,
  })
  async searchLocations(@Query() query: LocationSearchQueryDto): Promise<LocationSearchResponseDto> {
    const result = await this.externalService.searchLocations(query.query);
    return { data: result };
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

