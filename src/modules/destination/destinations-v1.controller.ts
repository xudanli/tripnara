import { Body, Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DestinationEntity } from '../persistence/entities/reference.entity';
import { FestivalService } from './services/festival.service';
import { WeatherService } from './services/weather.service';
import { EventsRequestDto, EventsResponseDto } from './dto/destination.dto';

@ApiTags('Destinations V1')
@Controller('v1/destinations')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DestinationsV1Controller {
  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destinationRepository: Repository<DestinationEntity>,
    private readonly festivalService: FestivalService,
    private readonly weatherService: WeatherService,
  ) {}

  @Get(':id/events')
  @ApiOperation({
    summary: '获取目的地活动信息',
    description: '根据目的地ID获取活动信息（Eventbrite 等）',
  })
  @ApiParam({ name: 'id', description: '目的地ID（UUID）' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO格式）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO格式）' })
  @ApiQuery({ name: 'category', required: false, description: '活动类别' })
  async getDestinationEvents(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
  ): Promise<EventsResponseDto> {
    // 根据ID查找目的地
    const destination = await this.destinationRepository.findOne({
      where: { id },
    });

    if (!destination) {
      throw new NotFoundException(`目的地不存在: ${id}`);
    }

    // 使用目的地名称查询活动
    const dto: EventsRequestDto = {
      destination: destination.name,
      startDate,
      endDate,
      category,
    };

    return this.festivalService.listEvents(dto);
  }

  @Get(':id/weather')
  @ApiOperation({
    summary: '获取目的地天气信息',
    description: '根据目的地ID获取天气信息（可选，需要配置天气 API）',
  })
  @ApiParam({ name: 'id', description: '目的地ID（UUID）' })
  async getDestinationWeather(@Param('id') id: string) {
    // 根据ID查找目的地
    const destination = await this.destinationRepository.findOne({
      where: { id },
    });

    if (!destination) {
      throw new NotFoundException(`目的地不存在: ${id}`);
    }

    // 获取坐标（如果有）
    const coordinates = destination.geoJson as
      | { lat?: number; lng?: number; coordinates?: [number, number] }
      | undefined;

    let lat: number | undefined;
    let lng: number | undefined;

    if (coordinates) {
      if (coordinates.lat && coordinates.lng) {
        lat = coordinates.lat;
        lng = coordinates.lng;
      } else if (coordinates.coordinates) {
        // GeoJSON 格式：[lng, lat]
        lng = coordinates.coordinates[0];
        lat = coordinates.coordinates[1];
      }
    }

    return this.weatherService.getWeatherByDestinationId(
      id,
      destination.name,
      lat && lng ? { lat, lng } : undefined,
      destination.countryCode,
    );
  }

  @Post('find-or-create')
  @ApiOperation({
    summary: '查找或创建目的地',
    description: '根据目的地名称查找目的地，如果不存在则创建新的目的地',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '目的地名称',
          example: '冰岛',
        },
        countryCode: {
          type: 'string',
          description: '国家代码（可选）',
          example: 'IS',
        },
      },
      required: ['name'],
    },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            countryCode: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  async findOrCreateDestination(
    @Body() body: { name: string; countryCode?: string },
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      slug: string;
      countryCode?: string;
    };
  }> {
    const { name, countryCode } = body;

    if (!name || name.trim().length === 0) {
      throw new NotFoundException('目的地名称不能为空');
    }

    // 生成 slug
    const slug = this.generateSlug(name);

    // 先尝试根据 slug 查找
    let destination = await this.destinationRepository.findOne({
      where: { slug },
    });

    // 如果没找到，尝试根据名称查找
    if (!destination) {
      destination = await this.destinationRepository.findOne({
        where: { name: name.trim() },
      });
    }

    // 如果找到了，返回
    if (destination) {
      return {
        success: true,
        data: {
          id: destination.id,
          name: destination.name,
          slug: destination.slug,
          countryCode: destination.countryCode || undefined,
        },
      };
    }

    // 如果没找到，创建新的目的地
    // 如果 slug 已存在，添加后缀
    let finalSlug = slug;
    let counter = 1;
    while (
      await this.destinationRepository.findOne({
        where: { slug: finalSlug },
      })
    ) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const newDestination = this.destinationRepository.create({
      name: name.trim(),
      slug: finalSlug,
      countryCode: countryCode || undefined,
    });

    const saved = await this.destinationRepository.save(newDestination);

    return {
      success: true,
      data: {
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        countryCode: saved.countryCode || undefined,
      },
    };
  }

  /**
   * 生成 URL 友好的 slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-') // 空格和下划线替换为连字符
      .replace(/[^\w\-]+/g, '') // 移除特殊字符
      .replace(/\-\-+/g, '-') // 多个连字符替换为单个
      .replace(/^-+/, '') // 移除开头的连字符
      .replace(/-+$/, '') // 移除结尾的连字符
      .substring(0, 150); // 限制长度
  }
}

