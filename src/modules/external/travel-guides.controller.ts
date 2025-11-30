import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalService } from './external.service';
import {
  PlatformSearchRequestDto,
  TravelGuideResponseDto,
  TravelGuideSearchQueryDto,
} from './dto/travel-guides.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Travel Guides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('travel-guides')
export class TravelGuidesController {
  constructor(private readonly externalService: ExternalService) {}

  @Get('search')
  @ApiOperation({ summary: '根据目的地搜索 TripAdvisor 指南' })
  @ApiOkResponse({ type: TravelGuideResponseDto })
  async search(
    @Query() query: TravelGuideSearchQueryDto,
  ): Promise<TravelGuideResponseDto> {
    return this.externalService.searchTravelGuides(query);
  }

  @Post('platform-search')
  @ApiOperation({
    summary: '多平台攻略聚合搜索',
    description:
      '支持搜索多个平台的旅行攻略，包括马蜂窝、携程、穷游网、飞猪、TripAdvisor、Lonely Planet、Rough Guides、Wikitravel 等',
  })
  @ApiOkResponse({ type: TravelGuideResponseDto })
  async platformSearch(
    @Body() dto: PlatformSearchRequestDto,
  ): Promise<TravelGuideResponseDto> {
    return this.externalService.searchPlatformGuides(dto);
  }
}

