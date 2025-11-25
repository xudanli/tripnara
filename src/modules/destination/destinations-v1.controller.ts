import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DestinationEntity } from '../persistence/entities/reference.entity';
import { FestivalService } from './services/festival.service';
import { EventsRequestDto, EventsResponseDto } from './dto/destination.dto';

@ApiTags('Destinations V1')
@Controller('v1/destinations')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DestinationsV1Controller {
  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destinationRepository: Repository<DestinationEntity>,
    private readonly festivalService: FestivalService,
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
}

