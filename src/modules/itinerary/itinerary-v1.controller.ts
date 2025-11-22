import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ItineraryService } from './itinerary.service';
import {
  CreateItineraryTemplateDto,
  CreateItineraryTemplateResponseDto,
  ItineraryTemplateQueryDto,
  ItineraryTemplateListResponseDto,
  ItineraryTemplateDetailResponseDto,
  UpdateItineraryTemplateDto,
  UpdateItineraryTemplateResponseDto,
  DeleteItineraryTemplateResponseDto,
  PublishItineraryTemplateResponseDto,
  CloneItineraryTemplateResponseDto,
} from './dto/itinerary.dto';

@ApiTags('Itinerary V1')
@Controller('v1/itineraries')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ItineraryV1Controller {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post()
  @ApiOperation({
    summary: '新建行程模版',
    description: '创建一个新的行程模版，接受顶层格式的数据（包含 title、language、tasks 等字段）',
  })
  async createItineraryTemplate(
    @Body() dto: CreateItineraryTemplateDto,
  ): Promise<CreateItineraryTemplateResponseDto> {
    return this.itineraryService.createItineraryTemplate(dto);
  }

  @Get()
  @ApiOperation({
    summary: '获取行程模版列表',
    description: '获取行程模版列表，支持多种筛选条件（状态、关键字、目的地、预算、旅行风格等）',
  })
  async getItineraryTemplateList(
    @Query() query: ItineraryTemplateQueryDto,
  ): Promise<ItineraryTemplateListResponseDto> {
    return this.itineraryService.getItineraryTemplateList(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '根据ID获取行程模版详情',
    description: '根据ID获取完整的行程模版详情，包含所有天数和活动信息',
  })
  async getItineraryTemplateById(
    @Param('id') id: string,
    @Query('language') language?: string,
  ): Promise<ItineraryTemplateDetailResponseDto> {
    return this.itineraryService.getItineraryTemplateById(id, language);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新行程模版',
    description: '更新已有的行程模版，所有字段都是可选的，只传入需要更新的字段即可',
  })
  async updateItineraryTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateItineraryTemplateDto,
  ): Promise<UpdateItineraryTemplateResponseDto> {
    return this.itineraryService.updateItineraryTemplate(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除行程模版',
    description: '删除指定的行程模版',
  })
  async deleteItineraryTemplate(
    @Param('id') id: string,
  ): Promise<DeleteItineraryTemplateResponseDto> {
    return this.itineraryService.deleteItineraryTemplate(id);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: '发布行程模版',
    description: '将草稿状态的行程模版发布为已发布状态',
  })
  async publishItineraryTemplate(
    @Param('id') id: string,
  ): Promise<PublishItineraryTemplateResponseDto> {
    return this.itineraryService.publishItineraryTemplate(id);
  }

  @Post(':id/clone')
  @ApiOperation({
    summary: '复制行程模版',
    description: '复制指定的行程模版，创建一个新的草稿模版',
  })
  async cloneItineraryTemplate(
    @Param('id') id: string,
  ): Promise<CloneItineraryTemplateResponseDto> {
    return this.itineraryService.cloneItineraryTemplate(id);
  }
}
