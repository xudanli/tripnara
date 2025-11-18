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
import { TravelSummaryService } from './travel-summary.service';
import {
  GenerateTravelSummaryRequestDto,
  GenerateTravelSummaryResponseDto,
} from './dto/travel-summary.dto';

@ApiTags('Travel Summary')
@Controller('travel')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TravelSummaryController {
  constructor(
    private readonly travelSummaryService: TravelSummaryService,
  ) {}

  @Post('summary')
  @ApiOperation({ summary: '生成旅行摘要' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateSummary(
    @Body() dto: GenerateTravelSummaryRequestDto,
  ): Promise<GenerateTravelSummaryResponseDto> {
    const data = await this.travelSummaryService.generateSummary(dto);
    return {
      success: true,
      data,
    };
  }
}

