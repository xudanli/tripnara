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
  CreateJourneyDto,
  CreateJourneyDayRequestDto,
  CreateJourneySlotRequestDto,
  JourneyQueryDto,
  UpdateJourneyDto,
  UpdateJourneyDayRequestDto,
  UpdateJourneySlotRequestDto,
} from './dto/journey.dto';
import { JourneyService } from './journey.service';

@ApiTags('Journeys')
@Controller('api/v1/journeys')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Get()
  @ApiOperation({ summary: '行程列表' })
  list(@Query() query: JourneyQueryDto) {
    return this.journeyService.listJourneys(query);
  }

  @Get(':journeyId')
  @ApiOperation({ summary: '行程详情' })
  getDetail(@Param('journeyId') journeyId: string) {
    return this.journeyService.getJourneyById(journeyId);
  }

  @Post()
  @ApiOperation({ summary: '创建行程' })
  create(@Body() dto: CreateJourneyDto) {
    return this.journeyService.createJourney(dto);
  }

  @Patch(':journeyId')
  @ApiOperation({ summary: '更新行程' })
  update(@Param('journeyId') journeyId: string, @Body() dto: UpdateJourneyDto) {
    return this.journeyService.updateJourney(journeyId, dto);
  }

  @Delete(':journeyId')
  @ApiOperation({ summary: '删除行程' })
  remove(@Param('journeyId') journeyId: string) {
    return this.journeyService.deleteJourney(journeyId);
  }

  @Get(':journeyId/days')
  listDays(@Param('journeyId') journeyId: string) {
    return this.journeyService.listDays(journeyId);
  }

  @Post(':journeyId/days')
  createDay(
    @Param('journeyId') journeyId: string,
    @Body() dto: CreateJourneyDayRequestDto,
  ) {
    return this.journeyService.createDay(journeyId, dto);
  }

  @Patch(':journeyId/days/:dayId')
  updateDay(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateJourneyDayRequestDto,
  ) {
    return this.journeyService.updateDay(journeyId, dayId, dto);
  }

  @Delete(':journeyId/days/:dayId')
  deleteDay(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.journeyService.deleteDay(journeyId, dayId);
  }

  @Get(':journeyId/days/:dayId/slots')
  listSlots(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.journeyService.listSlots(journeyId, dayId);
  }

  @Post(':journeyId/days/:dayId/slots')
  createSlot(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateJourneySlotRequestDto,
  ) {
    return this.journeyService.createSlot(journeyId, dayId, dto);
  }

  @Patch(':journeyId/days/:dayId/slots/:slotId')
  updateSlot(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateJourneySlotRequestDto,
  ) {
    return this.journeyService.updateSlot(journeyId, dayId, slotId, dto);
  }

  @Delete(':journeyId/days/:dayId/slots/:slotId')
  deleteSlot(
    @Param('journeyId') journeyId: string,
    @Param('dayId') dayId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.journeyService.deleteSlot(journeyId, dayId, slotId);
  }
}
