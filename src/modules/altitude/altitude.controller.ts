import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AltitudeService } from './altitude.service';
import {
  SearchAltitudeRegionsRequestDto,
  SearchAltitudeRegionsResponseDto,
  GetRiskReportRequestDto,
  RiskReportResponseDto,
} from './dto/altitude.dto';

@ApiTags('Travel Advisor - Altitude')
@Controller('travel-advisor/altitude')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AltitudeController {
  constructor(private readonly altitudeService: AltitudeService) {}

  /**
   * 搜索接口（当用户在输入框打字时调用）
   * GET /travel-advisor/altitude/search?q=拉萨
   */
  @Get('search')
  @ApiOperation({
    summary: '搜索高海拔地区',
    description: '根据关键词模糊搜索高海拔地区，支持地区名称、别名、国家名称搜索',
  })
  @ApiQuery({
    name: 'q',
    description: '搜索关键词',
    example: '拉萨',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    type: SearchAltitudeRegionsResponseDto,
  })
  search(@Query('q') query: string): SearchAltitudeRegionsResponseDto {
    const results = this.altitudeService.searchRegions(query);
    return {
      results,
    };
  }

  /**
   * 详情与风险接口（当用户点击某个地点时调用）
   * GET /travel-advisor/altitude/risk?id=cn-lasa
   */
  @Get('risk')
  @ApiOperation({
    summary: '获取高海拔地区风险报告',
    description:
      '获取指定高海拔地区的实时天气和风险评估，包括风险等级、建议、标签等',
  })
  @ApiQuery({
    name: 'id',
    description: '地区ID',
    example: 'cn-lasa',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: RiskReportResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '地区不存在',
  })
  async getRisk(@Query('id') id: string): Promise<RiskReportResponseDto> {
    return await this.altitudeService.getRiskReport(id);
  }
}

