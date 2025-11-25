import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransportService } from './services/transport.service';
import { TransportRequestDto, TransportResponseDto } from './dto/destination.dto';

@ApiTags('Transport V1')
@Controller('v1/transport')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TransportV1Controller {
  constructor(private readonly transportService: TransportService) {}

  @Post('insights')
  @ApiOperation({
    summary: '交通规划',
    description: '根据起点、终点和交通方式获取交通规划信息（origin/destination/mode）',
  })
  async getTransportInsights(
    @Body() dto: TransportRequestDto,
  ): Promise<TransportResponseDto> {
    return this.transportService.calculateRoutes(dto);
  }
}

