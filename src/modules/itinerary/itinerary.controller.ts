import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ItineraryService } from './itinerary.service';
import {
  GenerateItineraryRequestDto,
  GenerateItineraryResponseDto,
  CreateItineraryRequestDto,
  UpdateItineraryRequestDto,
  CreateItineraryResponseDto,
  UpdateItineraryResponseDto,
  DeleteItineraryResponseDto,
  ItineraryListResponseDto,
  ItineraryDetailResponseDto,
  CreateItineraryFromFrontendDataDto,
} from './dto/itinerary.dto';

@ApiTags('Itinerary')
@Controller('itinerary')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post('generate')
  @ApiOperation({ summary: '生成旅行行程' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateItinerary(
    @Body() dto: GenerateItineraryRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<GenerateItineraryResponseDto> {
    return this.itineraryService.generateItinerary(dto, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建行程' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createItinerary(
    @Body() dto: CreateItineraryRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<CreateItineraryResponseDto> {
    return this.itineraryService.createItinerary(dto, user.userId);
  }

  @Post('from-frontend-data')
  @ApiOperation({
    summary: '从前端数据格式创建行程',
    description:
      '接受前端提供的完整行程数据格式（包含 itineraryData 和 tasks），自动转换为标准格式并创建行程',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createItineraryFromFrontendData(
    @Body() dto: CreateItineraryFromFrontendDataDto,
    @CurrentUser() user: { userId: string },
  ): Promise<CreateItineraryResponseDto> {
    return this.itineraryService.createItineraryFromFrontendData(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: '获取行程列表' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getItineraryList(
    @Query('status') status?: 'draft' | 'published' | 'archived',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: { userId: string },
  ): Promise<ItineraryListResponseDto> {
    return this.itineraryService.getItineraryList(user!.userId, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取行程详情' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getItineraryById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ): Promise<ItineraryDetailResponseDto> {
    return this.itineraryService.getItineraryById(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新行程' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateItinerary(
    @Param('id') id: string,
    @Body() dto: UpdateItineraryRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<UpdateItineraryResponseDto> {
    return this.itineraryService.updateItinerary(id, dto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除行程' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteItinerary(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ): Promise<DeleteItineraryResponseDto> {
    return this.itineraryService.deleteItinerary(id, user.userId);
  }
}

