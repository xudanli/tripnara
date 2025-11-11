import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { EventsRequestDto, EventsResponseDto } from '../dto/destination.dto';

interface EventbriteEvent {
  id: string;
  name: { text?: string };
  url?: string;
  start?: { utc?: string };
  end?: { utc?: string };
  venue?: { address?: { localized_address_display?: string } };
}

interface EventbriteResponse {
  events: EventbriteEvent[];
}

@Injectable()
export class FestivalService {
  private readonly logger = new Logger(FestivalService.name);
  private readonly baseUrl: string;
  private readonly apiToken?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('EVENTBRITE_BASE_URL') ??
      'https://www.eventbriteapi.com/v3';
    this.apiToken = this.configService.get<string>('EVENTBRITE_API_TOKEN');
  }

  async listEvents(dto: EventsRequestDto): Promise<EventsResponseDto> {
    if (!this.apiToken) {
      throw new Error('EVENTBRITE_API_TOKEN 未配置，无法获取活动信息');
    }

    const url = `${this.baseUrl}/events/search/`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<EventbriteResponse>(url, {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
          params: {
            q: dto.destination,
            'location.address': dto.destination,
            'start_date.range_start': dto.startDate,
            'start_date.range_end': dto.endDate,
            categories: dto.category,
            expand: 'venue',
            sort_by: 'date',
          },
        }),
      );

      const events = (response.data.events ?? []).map((event) => ({
        id: event.id,
        name: event.name?.text ?? '未命名活动',
        startDate: event.start?.utc ?? new Date().toISOString(),
        endDate: event.end?.utc,
        url: event.url,
        venue: {
          address: event.venue?.address?.localized_address_display,
        },
      }));

      return { events };
    } catch (error) {
      this.handleError(error);
      throw new Error('调用活动聚合服务失败');
    }
  }

  private handleError(error: unknown): void {
    if (isAxiosError<EventbriteResponse>(error)) {
      const { status, data } = error.response ?? {};
      this.logger.error('调用 Eventbrite API 失败', { status, data });
    } else if (error instanceof Error) {
      this.logger.error('调用 Eventbrite API 发生未知错误', error);
    } else {
      this.logger.error('调用 Eventbrite API 发生未知错误', {
        value: error,
      });
    }
  }
}
