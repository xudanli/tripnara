import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalService } from './external.service';
import { TravelGuideResponseDto, TravelGuideSearchQueryDto } from './dto/travel-guides.dto';
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
}

