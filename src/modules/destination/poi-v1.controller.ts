import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PoiService } from './services/poi.service';
import { PoiSearchRequestDto, PoiSearchResponseDto } from './dto/poi.dto';

@ApiTags('POI V1')
@Controller('v1/poi')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PoiV1Controller {
  constructor(private readonly poiService: PoiService) {}

  @Post('search')
  @ApiOperation({
    summary: 'POI 搜索',
    description: '搜索兴趣点（前端 ExperienceDay 复用）',
  })
  async searchPoi(@Body() dto: PoiSearchRequestDto): Promise<PoiSearchResponseDto> {
    return this.poiService.searchPoi(dto);
  }
}

