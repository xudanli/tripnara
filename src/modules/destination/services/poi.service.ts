import { Injectable, Logger } from '@nestjs/common';
import { ExternalService } from '../../external/external.service';
import { GeocodeService } from './geocode.service';
import { PoiSearchRequestDto, PoiSearchResponseDto, PoiItemDto } from '../dto/poi.dto';

@Injectable()
export class PoiService {
  private readonly logger = new Logger(PoiService.name);

  constructor(
    private readonly externalService: ExternalService,
    private readonly geocodeService: GeocodeService,
  ) {}

  /**
   * 搜索 POI（兴趣点）
   * 复用现有的外部搜索服务
   */
  async searchPoi(dto: PoiSearchRequestDto): Promise<PoiSearchResponseDto> {
    try {
      // 如果有目的地名称，先进行地理编码获取坐标
      let searchLocation = dto.destination || dto.query;

      // 如果提供了坐标，使用坐标；否则使用目的地名称或查询关键词
      if (dto.latitude && dto.longitude) {
        // 使用坐标进行搜索（可以通过反向地理编码获取地点名称）
        searchLocation = `${dto.latitude},${dto.longitude}`;
      }

      // 使用 Travel Advisor 搜索位置
      const locationResults = await this.externalService.searchLocations(
        searchLocation || dto.query,
      );

      // 转换结果为 POI 格式
      const pois: PoiItemDto[] = [];

      if (locationResults.data && Array.isArray(locationResults.data)) {
        const limit = dto.limit || 20;
        const items = locationResults.data.slice(0, limit);

        for (const item of items) {
          // 根据 Travel Advisor 返回的数据结构进行转换
          // 注意：实际的数据结构可能需要根据 API 响应调整
          const poi: PoiItemDto = {
            id: item.location_id?.toString() || `poi-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || item.title || dto.query,
            address: item.address || item.address_string,
            latitude: item.latitude || item.lat || dto.latitude || 0,
            longitude: item.longitude || item.long || dto.longitude || 0,
            type: this.mapType(item.category || item.type, dto.type),
            rating: item.rating || item.rating_value,
            imageUrl: item.photo?.images?.medium?.url || item.image_url,
            description: item.description || item.intro,
          };

          // 过滤类型（如果指定了类型）
          if (dto.type && dto.type !== 'all') {
            if (poi.type !== dto.type) {
              continue;
            }
          }

          pois.push(poi);
        }
      }

      // 如果没有结果，返回基于查询关键词的占位符结果
      if (pois.length === 0) {
        this.logger.warn(`未找到 POI 结果，查询: ${dto.query}`);
        
        // 返回一个占位符结果
        const placeholderPoi: PoiItemDto = {
          id: 'placeholder-1',
          name: dto.query,
          latitude: dto.latitude || 0,
          longitude: dto.longitude || 0,
          type: dto.type || 'all',
        };
        pois.push(placeholderPoi);
      }

      return {
        data: pois,
        total: pois.length,
      };
    } catch (error) {
      this.logger.error(`POI 搜索失败: ${error}`);
      
      // 返回空结果而不是抛出错误
      return {
        data: [],
        total: 0,
      };
    }
  }

  /**
   * 映射类型
   */
  private mapType(
    category: string | undefined,
    requestedType?: string,
  ): string {
    if (requestedType && requestedType !== 'all') {
      return requestedType;
    }

    if (!category) {
      return 'attraction';
    }

    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('restaurant') || categoryLower.includes('food')) {
      return 'restaurant';
    }
    if (categoryLower.includes('hotel') || categoryLower.includes('lodging')) {
      return 'hotel';
    }
    if (categoryLower.includes('shop') || categoryLower.includes('mall')) {
      return 'shopping';
    }
    
    return 'attraction';
  }
}

