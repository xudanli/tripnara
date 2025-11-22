import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SeekerService } from './seeker.service';
import {
  GenerateSeekerTravelPlanRequestDto,
  GenerateSeekerTravelPlanResponseDto,
} from './dto/seeker.dto';

@ApiTags('Seeker')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('seeker')
export class SeekerController {
  constructor(private readonly seekerService: SeekerService) {}

  @Post('generate-travel-plan')
  @ApiOperation({
    summary: '生成 Seeker 模式行程',
    description:
      '根据用户的心情、期望体验、预算和时长，生成个性化的旅行计划',
  })
  @ApiOkResponse({ type: GenerateSeekerTravelPlanResponseDto })
  async generateTravelPlan(
    @Body() dto: GenerateSeekerTravelPlanRequestDto,
  ): Promise<GenerateSeekerTravelPlanResponseDto> {
    return this.seekerService.generateTravelPlan(dto);
  }
}

