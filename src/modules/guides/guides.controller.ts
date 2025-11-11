import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GuideSearchRequestDto,
  GuideSearchResponseDto,
  GuideSourcesResponseDto,
} from './dto/guides.dto';
import { GuideSourceService } from './services/guide-source.service';
import { GuidesCacheService } from './services/guides-cache.service';

@ApiTags('Guides')
@Controller('guides')
export class GuidesController {
  constructor(
    private readonly guideSourceService: GuideSourceService,
    private readonly guidesCacheService: GuidesCacheService,
  ) {}

  @Post('search')
  @ApiOperation({
    summary: 'Search for travel guides across configured providers.',
  })
  @ApiOkResponse({ type: GuideSearchResponseDto })
  async searchGuides(
    @Body() dto: GuideSearchRequestDto,
  ): Promise<GuideSearchResponseDto> {
    const cached = this.guidesCacheService.get(dto);
    if (cached) {
      return cached;
    }

    const response = await this.guideSourceService.searchGuides(dto);
    this.guidesCacheService.set(dto, response);
    return response;
  }

  @Get('sources')
  @ApiOperation({ summary: 'List available guide sources and metadata.' })
  @ApiOkResponse({ type: GuideSourcesResponseDto })
  getSources(): GuideSourcesResponseDto {
    return this.guideSourceService.listSources();
  }
}
