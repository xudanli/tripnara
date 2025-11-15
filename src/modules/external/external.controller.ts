import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalService } from './external.service';
import {
  EventSearchQueryDto,
  LocationSearchQueryDto,
} from './dto/external.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('External Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @Get('events')
  @ApiOperation({ summary: '搜索 Eventbrite 活动' })
  async searchEvents(@Query() query: EventSearchQueryDto) {
    const data = await this.externalService.searchEvents(query.location);
    return { data };
  }

  @Get('locations')
  @ApiOperation({ summary: '搜索 Travel Advisor 目的地' })
  async searchLocations(@Query() query: LocationSearchQueryDto) {
    const data = await this.externalService.searchLocations(query.query);
    return { data };
  }
}

