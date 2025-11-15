import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class ExternalService {
  private readonly logger = new Logger(ExternalService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly cacheTtlMs = 5 * 60 * 1000;

  private readonly eventbriteToken: string;
  private readonly eventbriteBaseUrl: string;
  private readonly travelAdvisorApiKey: string;
  private readonly travelAdvisorApiHost: string;
  private readonly travelAdvisorBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.eventbriteToken =
      this.configService.get<string>('EVENTBRITE_API_TOKEN') ?? '';
    this.eventbriteBaseUrl = this.configService.getOrThrow<string>(
      'EVENTBRITE_BASE_URL',
    );
    this.travelAdvisorApiKey =
      this.configService.get<string>('TRAVEL_ADVISOR_API_KEY') ?? '';
    this.travelAdvisorApiHost =
      this.configService.getOrThrow<string>('TRAVEL_ADVISOR_API_HOST');
    this.travelAdvisorBaseUrl = this.configService.getOrThrow<string>(
      'TRAVEL_ADVISOR_BASE_URL',
    );
  }

  async searchEvents(location: string) {
    if (!this.eventbriteToken) {
      throw new HttpException(
        {
          message: 'EVENTBRITE_TOKEN_MISSING',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const cacheKey = `eventbrite:${location.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchUrl = new URL(
        '/v3/events/search/',
        this.eventbriteBaseUrl,
      ).toString();
      const { data } = await axios.get(searchUrl, {
        params: {
          'location.address': location,
          expand: 'venue',
        },
        headers: {
          Authorization: `Bearer ${this.eventbriteToken}`,
        },
      });
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      this.logger.error(
        `Eventbrite API error`,
        (error as any)?.response?.data ?? error,
      );
      throw new HttpException(
        { message: 'EVENTBRITE_SERVICE_UNAVAILABLE' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async searchLocations(query: string) {
    if (!this.travelAdvisorApiKey) {
      throw new HttpException(
        { message: 'TRAVEL_ADVISOR_KEY_MISSING' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const cacheKey = `travel-advisor:${query.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchUrl = new URL(
        '/locations/search',
        this.travelAdvisorBaseUrl,
      ).toString();
      const { data } = await axios.get(searchUrl, {
        params: { query },
        headers: {
          'X-RapidAPI-Key': this.travelAdvisorApiKey,
          'X-RapidAPI-Host': this.travelAdvisorApiHost,
        },
      });
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      this.logger.error(
        `Travel Advisor API error`,
        (error as any)?.response?.data ?? error,
      );
      throw new HttpException(
        { message: 'TRAVEL_ADVISOR_SERVICE_UNAVAILABLE' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCache<T>(key: string, value: T) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }
}

