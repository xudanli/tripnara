import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateTemplateDto,
  TemplateQueryDto,
  UpdateTemplateDto,
  CreateTemplateDayRequestDto,
  UpdateTemplateDayRequestDto,
  CreateTemplateSlotRequestDto,
  UpdateTemplateSlotRequestDto,
} from './dto/template.dto';
import { TemplateService } from './template.service';

@ApiTags('Templates')
@Controller('api/v1/templates')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @ApiOperation({ summary: '模板列表' })
  list(@Query() query: TemplateQueryDto) {
    return this.templateService.listTemplates(query);
  }

  @Get(':templateId')
  @ApiOperation({ summary: '模板详情' })
  getDetail(@Param('templateId') templateId: string) {
    return this.templateService.getTemplateById(templateId);
  }

  @Post()
  @ApiOperation({ summary: '创建模板' })
  create(@Body() dto: CreateTemplateDto) {
    return this.templateService.createTemplate(dto);
  }

  @Patch(':templateId')
  @ApiOperation({ summary: '更新模板' })
  update(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.updateTemplate(templateId, dto);
  }

  @Delete(':templateId')
  @ApiOperation({ summary: '删除模板' })
  remove(@Param('templateId') templateId: string) {
    return this.templateService.deleteTemplate(templateId);
  }

  @Post(':templateId/publish')
  @ApiOperation({ summary: '发布模板' })
  publish(@Param('templateId') templateId: string) {
    return this.templateService.publishTemplate(templateId);
  }

  @Post(':templateId/clone')
  @ApiOperation({ summary: '复制模板' })
  clone(@Param('templateId') templateId: string) {
    return this.templateService.cloneTemplate(templateId);
  }

  @Get(':templateId/days')
  listDays(@Param('templateId') templateId: string) {
    return this.templateService.listDays(templateId);
  }

  @Post(':templateId/days')
  createDay(
    @Param('templateId') templateId: string,
    @Body() dto: CreateTemplateDayRequestDto,
  ) {
    return this.templateService.createDay(templateId, dto);
  }

  @Patch(':templateId/days/:dayId')
  updateDay(
    @Param('templateId') templateId: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateTemplateDayRequestDto,
  ) {
    return this.templateService.updateDay(templateId, dayId, dto);
  }

  @Delete(':templateId/days/:dayId')
  deleteDay(
    @Param('templateId') templateId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.templateService.deleteDay(templateId, dayId);
  }

  @Get(':templateId/days/:dayId/slots')
  listSlots(
    @Param('templateId') templateId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.templateService.listSlots(templateId, dayId);
  }

  @Post(':templateId/days/:dayId/slots')
  createSlot(
    @Param('templateId') templateId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateTemplateSlotRequestDto,
  ) {
    return this.templateService.createSlot(templateId, dayId, dto);
  }

  @Patch(':templateId/days/:dayId/slots/:slotId')
  updateSlot(
    @Param('templateId') templateId: string,
    @Param('dayId') dayId: string,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateTemplateSlotRequestDto,
  ) {
    return this.templateService.updateSlot(templateId, dayId, slotId, dto);
  }

  @Delete(':templateId/days/:dayId/slots/:slotId')
  deleteSlot(
    @Param('templateId') templateId: string,
    @Param('dayId') dayId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.templateService.deleteSlot(templateId, dayId, slotId);
  }
}
