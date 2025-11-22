import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InspirationService } from './inspiration.service';
import {
  DetectIntentRequestDto,
  DetectIntentResponseDto,
  RecommendDestinationsRequestDto,
  RecommendDestinationsResponseDto,
  GenerateInspirationItineraryRequestDto,
  GenerateItineraryResponseDto,
  ExtractDaysRequestDto,
  ExtractDaysResponseDto,
} from './dto/inspiration.dto';

@ApiTags('Inspiration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('inspiration')
export class InspirationController {
  constructor(
    private readonly inspirationService: InspirationService,
  ) {}

  @Post('detect-intent')
  @ApiOperation({
    summary: '意图识别',
    description: '分析用户自然语言输入，识别旅行意图、关键词、情感倾向等',
  })
  @ApiOkResponse({ type: DetectIntentResponseDto })
  async detectIntent(
    @Body() dto: DetectIntentRequestDto,
  ): Promise<DetectIntentResponseDto> {
    return this.inspirationService.detectIntent(dto);
  }

  @Post('recommend-destinations')
  @ApiOperation({
    summary: '目的地推荐',
    description: '根据用户意图和需求，推荐候选目的地列表（8-12个）',
  })
  @ApiOkResponse({ type: RecommendDestinationsResponseDto })
  async recommendDestinations(
    @Body() dto: RecommendDestinationsRequestDto,
  ): Promise<RecommendDestinationsResponseDto> {
    return this.inspirationService.recommendDestinations(dto);
  }

  @Post('generate-itinerary')
  @ApiOperation({
    summary: '生成完整行程',
    description: '根据用户输入和意图，生成完整的详细行程',
  })
  @ApiOkResponse({ type: GenerateItineraryResponseDto })
  async generateItinerary(
    @Body() dto: GenerateInspirationItineraryRequestDto,
  ): Promise<GenerateItineraryResponseDto> {
    return this.inspirationService.generateItinerary(dto);
  }

  @Post('extract-days')
  @ApiOperation({
    summary: '天数提取',
    description: '从用户输入中提取行程天数',
  })
  @ApiOkResponse({ type: ExtractDaysResponseDto })
  async extractDays(
    @Body() dto: ExtractDaysRequestDto,
  ): Promise<ExtractDaysResponseDto> {
    return this.inspirationService.extractDays(dto);
  }
}

