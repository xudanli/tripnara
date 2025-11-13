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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VisaService } from './visa.service';
import {
  GetVisaInfoQueryDto,
  MultiDestinationAnalysisRequestDto,
  CreateVisaPolicyDto,
  UpdateVisaPolicyDto,
  VisaPolicyQueryDto,
} from './dto/visa.dto';

@ApiTags('Visa')
@Controller('visa')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class VisaController {
  constructor(private readonly visaService: VisaService) {}

  @Get('info')
  @ApiOperation({ summary: '查询指定目的地的签证信息' })
  async getVisaInfo(@Query() query: GetVisaInfoQueryDto) {
    const { destinationCountry, nationalityCode, permanentResidencyCode } =
      query;
    const data = await this.visaService.getVisaInfo(
      destinationCountry,
      nationalityCode,
      permanentResidencyCode,
    );
    return {
      success: true,
      data,
    };
  }

  @Post('multi-destination-analysis')
  @ApiOperation({ summary: '多目的地签证分析' })
  async analyzeMultiDestination(
    @Body() body: MultiDestinationAnalysisRequestDto,
  ) {
    const data = await this.visaService.analyzeMultiDestinationVisa(body);
    return {
      success: true,
      data,
    };
  }

  @Get('admin/policies')
  @ApiOperation({ summary: '获取所有签证政策（管理接口）' })
  async listPolicies(@Query() query: VisaPolicyQueryDto) {
    return this.visaService.listPolicies(query);
  }

  @Post('admin/policies')
  @ApiOperation({ summary: '创建新的签证政策' })
  async createPolicy(@Body() dto: CreateVisaPolicyDto) {
    const data = await this.visaService.createPolicy(dto);
    return {
      success: true,
      data,
    };
  }

  @Patch('admin/policies/:id')
  @ApiOperation({ summary: '更新签证政策' })
  async updatePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVisaPolicyDto,
  ) {
    const data = await this.visaService.updatePolicy(id, dto);
    return {
      success: true,
      data,
    };
  }

  @Delete('admin/policies/:id')
  @ApiOperation({ summary: '删除签证政策（软删除）' })
  async deletePolicy(@Param('id', ParseIntPipe) id: number) {
    await this.visaService.deletePolicy(id);
    return {
      success: true,
      message: '签证政策已删除',
    };
  }

  @Get('admin/policies/:id/history')
  @ApiOperation({ summary: '获取政策变更历史' })
  async getPolicyHistory(@Param('id', ParseIntPipe) id: number) {
    const data = await this.visaService.getPolicyHistory(id);
    return {
      success: true,
      data,
    };
  }
}

