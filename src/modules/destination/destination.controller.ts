import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  EventsRequestDto,
  EventsResponseDto,
  GeocodeLookupDto,
  GeocodeResponseDto,
  ReverseGeocodeQueryDto,
  ReverseGeocodeResponseDto,
  HighAltitudeQueryDto,
  HighAltitudeResponseDto,
  TransportRequestDto,
  TransportResponseDto,
} from './dto/destination.dto';
import { GeocodeService } from './services/geocode.service';
import { TransportService } from './services/transport.service';
import { AltitudeService } from './services/altitude.service';
import { FestivalService } from './services/festival.service';

@ApiTags('Destination')
@Controller('destination')
export class DestinationController {
  constructor(
    private readonly geocodeService: GeocodeService,
    private readonly transportService: TransportService,
    private readonly altitudeService: AltitudeService,
    private readonly festivalService: FestivalService,
  ) {}

  @Post('geocode')
  @ApiOperation({
    summary: 'Resolve destination names to canonical geocoding results.',
  })
  @ApiOkResponse({ type: GeocodeResponseDto })
  geocode(@Body() dto: GeocodeLookupDto): Promise<GeocodeResponseDto> {
    return this.geocodeService.lookup(dto);
  }

  @Get('reverse-geocode')
  @ApiOperation({
    summary: '反向地理编码：根据经纬度获取国家/省州/城市标签',
    description:
      '优先用于反向地理编码（经纬度 → 国家/省州/城市标签），支撑灵感详情页的地点展示',
  })
  @ApiOkResponse({ type: ReverseGeocodeResponseDto })
  reverseGeocode(
    @Query() query: ReverseGeocodeQueryDto,
  ): Promise<ReverseGeocodeResponseDto> {
    return this.geocodeService.reverseGeocode(query);
  }

  @Post('transport')
  @ApiOperation({
    summary: 'Retrieve transport options between the provided coordinates.',
  })
  @ApiOkResponse({ type: TransportResponseDto })
  transport(@Body() dto: TransportRequestDto): Promise<TransportResponseDto> {
    return this.transportService.calculateRoutes(dto);
  }

  @Post('events')
  @ApiOperation({ summary: 'Fetch festival and event data for a destination.' })
  @ApiOkResponse({ type: EventsResponseDto })
  events(@Body() dto: EventsRequestDto): Promise<EventsResponseDto> {
    return this.festivalService.listEvents(dto);
  }

  @Get('high-altitude')
  @ApiOperation({
    summary: 'Determine whether a destination is considered high altitude.',
  })
  @ApiOkResponse({ type: HighAltitudeResponseDto })
  highAltitude(
    @Query() query: HighAltitudeQueryDto,
  ): HighAltitudeResponseDto {
    return this.altitudeService.evaluateDestination(query.name);
  }
}
