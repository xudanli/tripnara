import { Injectable, Logger } from '@nestjs/common';
import {
  GuideSearchRequestDto,
  GuideSearchResponseDto,
} from '../dto/guides.dto';

interface CacheEntry {
  key: string;
  response: GuideSearchResponseDto;
  expiresAt: number;
}

@Injectable()
export class GuidesCacheService {
  private readonly logger = new Logger(GuidesCacheService.name);
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly store = new Map<string, CacheEntry>();

  get(dto: GuideSearchRequestDto): GuideSearchResponseDto | null {
    const key = this.buildKey(dto);
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    this.logger.debug(`Returning cached guides for key ${key}`);
    return entry.response;
  }

  set(dto: GuideSearchRequestDto, response: GuideSearchResponseDto): void {
    const key = this.buildKey(dto);

    this.store.set(key, {
      key,
      response,
      expiresAt: Date.now() + this.ttlMs,
    });

    this.logger.debug(`Cached guides for key ${key}`);
  }

  private buildKey(dto: GuideSearchRequestDto): string {
    return JSON.stringify({
      query: dto.query,
      language: dto.language,
      source: dto.source,
    });
  }
}
