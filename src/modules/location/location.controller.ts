import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationService } from './location.service';
import {
  GenerateLocationRequestDto,
  GenerateLocationResponseDto,
  GenerateLocationBatchRequestDto,
  GenerateLocationBatchResponseDto,
} from './dto/location.dto';

@ApiTags('Location')
@Controller('location')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post('generate')
  @ApiOperation({ summary: '生成单个活动的位置信息' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateLocation(
    @Body() dto: GenerateLocationRequestDto,
  ): Promise<GenerateLocationResponseDto> {
    const locationInfo = await this.locationService.generateLocationInfo(dto);
    return {
      success: true,
      data: locationInfo,
    };
  }

  @Post('generate-batch')
  @ApiOperation({ summary: '批量生成活动位置信息' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateLocationBatch(
    @Body() dto: GenerateLocationBatchRequestDto,
  ): Promise<GenerateLocationBatchResponseDto> {
    const results = await this.locationService.generateLocationBatch(
      dto.activities,
    );
    return {
      success: true,
      data: results,
    };
  }
}

