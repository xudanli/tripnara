import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  GuideResultDto,
  GuideSearchRequestDto,
  GuideSearchResponseDto,
  GuideSourceMetadataDto,
  GuideSourcesResponseDto,
} from '../dto/guides.dto';

interface GoogleSearchItem {
  title?: string;
  link?: string;
  snippet?: string;
  displayLink?: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

@Injectable()
export class GuideSourceService {
  private readonly logger = new Logger(GuideSourceService.name);
  private readonly apiKey?: string;
  private readonly cx?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GUIDES_GOOGLE_API_KEY');
    this.cx = this.configService.get<string>('GUIDES_GOOGLE_CX');
  }

  async searchGuides(
    dto: GuideSearchRequestDto,
  ): Promise<GuideSearchResponseDto> {
    if (!this.apiKey || !this.cx) {
      throw new Error(
        'GUIDES_GOOGLE_API_KEY 或 GUIDES_GOOGLE_CX 未配置，无法搜索导游内容',
      );
    }

    const params: Record<string, string> = {
      key: this.apiKey,
      cx: this.cx,
      q: dto.query,
    };

    if (dto.language) {
      params.lr = `lang_${dto.language}`;
    }

    if (dto.source) {
      params.siteSearch = dto.source;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<GoogleSearchResponse>(
          'https://www.googleapis.com/customsearch/v1',
          { params },
        ),
      );

      const results: GuideResultDto[] = (response.data.items ?? []).map(
        (item) => ({
          title: item.title ?? '未命名导游',
          url: item.link ?? '',
          source: item.displayLink,
          snippet: item.snippet,
        }),
      );

      return { results };
    } catch (error) {
      this.handleError(error);
      throw new Error('调用导游搜索服务失败');
    }
  }

  listSources(): GuideSourcesResponseDto {
    const sources: GuideSourceMetadataDto[] = [
      {
        id: 'google_custom_search',
        name: 'Google Custom Search',
        description: '基于 Google 自定义搜索的旅行攻略聚合',
        meta: {
          region: 'global',
        },
      },
    ];

    return { sources };
  }

  private handleError(error: unknown): void {
    if (isAxiosError<GoogleSearchResponse>(error)) {
      const { status, data } = error.response ?? {};
      this.logger.error('调用 Google Custom Search 失败', { status, data });
    } else if (error instanceof Error) {
      this.logger.error('调用 Google Custom Search 发生未知错误', error);
    } else {
      this.logger.error('调用 Google Custom Search 发生未知错误', {
        value: error,
      });
    }
  }
}
