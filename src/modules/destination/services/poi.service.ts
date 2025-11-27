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
   * 
   * 搜索策略：
   * 1. 如果提供了坐标，优先使用坐标搜索，同时提供 destination 作为上下文
   * 2. 如果只提供了目的地，使用目的地名称搜索
   * 3. 根据 query 参数构建搜索查询（支持特殊类型：加油站、充电桩、休息站）
   */
  async searchPoi(dto: PoiSearchRequestDto): Promise<PoiSearchResponseDto> {
    try {
      // 构建搜索查询
      // 如果提供了坐标，优先使用坐标搜索，同时提供 destination 作为上下文
      let searchQuery = dto.query;

      if (dto.latitude && dto.longitude) {
        // 使用坐标搜索，结合 destination 和 query 构建查询
        if (dto.destination) {
          searchQuery = `${dto.query} near ${dto.destination} ${dto.latitude},${dto.longitude}`;
        } else {
          searchQuery = `${dto.query} ${dto.latitude},${dto.longitude}`;
        }
      } else if (dto.destination) {
        // 使用目的地名称搜索
        searchQuery = `${dto.query} ${dto.destination}`;
      }

      // 使用 Travel Advisor 搜索位置
      const locationResults = await this.externalService.searchLocations(searchQuery);

      // 转换结果为 POI 格式
      const pois: PoiItemDto[] = [];

      if (locationResults.data && Array.isArray(locationResults.data)) {
        const limit = dto.limit || 20;
        const items = locationResults.data.slice(0, limit * 2); // 获取更多结果以便过滤

        for (const item of items) {
          // 根据 Travel Advisor 返回的数据结构进行转换
          const poi: PoiItemDto = {
            id: item.location_id?.toString() || `poi-${Math.random().toString(36).substr(2, 9)}`,
            // name 字段必须提供，不能为空
            name: this.ensureName(item.name || item.title || item.display_name, dto.query),
            // address 尽可能提供
            address: item.address || item.address_string || item.address_obj?.address_string || item.formatted_address,
            // 坐标必须提供
            latitude: item.latitude || item.lat || item.coordinates?.lat || dto.latitude || 0,
            longitude: item.longitude || item.long || item.coordinates?.lng || dto.longitude || 0,
            type: this.mapType(item.category || item.type || item.category_key, dto.type),
            rating: item.rating || item.rating_value || item.rating?.rating,
            imageUrl: item.photo?.images?.medium?.url || item.image_url || item.photo?.images?.large?.url,
            // description 尽可能提供
            description: item.description || item.intro || item.overview || item.short_description,
          };

          // 验证必需字段
          if (!poi.name || poi.name.trim() === '') {
            poi.name = '未知地点';
          }

          // 根据 query 参数过滤特殊类型（加油站、充电桩、休息站）
          // 当 type 为 'all' 时，需要根据 query 来过滤
          if (dto.type === 'all' || !dto.type) {
            if (!this.matchesQueryType(dto.query, poi)) {
              continue;
            }
          } else {
            // 如果指定了类型，进行类型过滤
            if (poi.type !== dto.type) {
              continue;
            }
          }

          // 验证坐标有效性
          if (poi.latitude === 0 && poi.longitude === 0) {
            // 如果坐标无效且没有提供默认坐标，跳过此项
            if (!dto.latitude || !dto.longitude) {
              continue;
            }
            // 使用请求中的坐标作为备用
            poi.latitude = dto.latitude;
            poi.longitude = dto.longitude;
          }

          pois.push(poi);

          // 达到限制数量后停止
          if (pois.length >= limit) {
            break;
          }
        }
      }

      // 如果没有结果，返回空数组（不返回占位符，让前端回退到 AI 搜索）
      if (pois.length === 0) {
        this.logger.warn(`未找到 POI 结果，查询: ${dto.query}, 目的地: ${dto.destination || 'N/A'}`);
      }

      return {
        data: pois,
        total: pois.length,
      };
    } catch (error) {
      this.logger.error(`POI 搜索失败: ${error}`, error instanceof Error ? error.stack : '');
      
      // 返回空结果而不是抛出错误，保证接口的稳定性
      return {
        data: [],
        total: 0,
      };
    }
  }

  /**
   * 确保 name 字段不为空
   */
  private ensureName(name: string | undefined, fallbackQuery: string): string {
    if (name && name.trim() !== '') {
      return name.trim();
    }
    // 如果 name 为空，使用查询关键词作为备用
    return fallbackQuery || '未知地点';
  }

  /**
   * 检查 POI 是否匹配查询类型
   * 用于处理特殊类型：加油站、充电桩、休息站
   */
  private matchesQueryType(query: string, poi: PoiItemDto): boolean {
    const queryLower = query.toLowerCase();
    const poiNameLower = (poi.name || '').toLowerCase();
    const poiTypeLower = (poi.type || '').toLowerCase();
    const poiDescriptionLower = (poi.description || '').toLowerCase();

    // 检查是否匹配加油站
    if (queryLower.includes('加油站') || queryLower.includes('gas') || queryLower.includes('fuel')) {
      return (
        poiNameLower.includes('gas') ||
        poiNameLower.includes('fuel') ||
        poiNameLower.includes('加油站') ||
        poiTypeLower.includes('gas') ||
        poiDescriptionLower.includes('gas') ||
        poiDescriptionLower.includes('fuel')
      );
    }

    // 检查是否匹配充电桩
    if (queryLower.includes('充电桩') || queryLower.includes('charging') || queryLower.includes('ev')) {
      return (
        poiNameLower.includes('charging') ||
        poiNameLower.includes('ev') ||
        poiNameLower.includes('electric') ||
        poiNameLower.includes('充电桩') ||
        poiTypeLower.includes('charging') ||
        poiDescriptionLower.includes('charging') ||
        poiDescriptionLower.includes('electric')
      );
    }

    // 检查是否匹配休息站
    if (queryLower.includes('休息站') || queryLower.includes('rest area') || queryLower.includes('rest stop')) {
      return (
        poiNameLower.includes('rest') ||
        poiNameLower.includes('rest area') ||
        poiNameLower.includes('rest stop') ||
        poiNameLower.includes('休息站') ||
        poiTypeLower.includes('rest') ||
        poiDescriptionLower.includes('rest area')
      );
    }

    // 其他类型默认匹配
    return true;
  }

  /**
   * 映射类型
   */
  private mapType(
    category: string | undefined,
    requestedType?: string,
  ): string {
    // 如果指定了类型且不是 'all'，直接返回
    if (requestedType && requestedType !== 'all') {
      return requestedType;
    }

    if (!category) {
      return 'attraction';
    }

    const categoryLower = category.toLowerCase();
    
    // 餐厅类型
    if (
      categoryLower.includes('restaurant') ||
      categoryLower.includes('food') ||
      categoryLower.includes('dining') ||
      categoryLower.includes('cafe') ||
      categoryLower.includes('café')
    ) {
      return 'restaurant';
    }
    
    // 酒店类型
    if (
      categoryLower.includes('hotel') ||
      categoryLower.includes('lodging') ||
      categoryLower.includes('accommodation') ||
      categoryLower.includes('resort')
    ) {
      return 'hotel';
    }
    
    // 购物类型
    if (
      categoryLower.includes('shop') ||
      categoryLower.includes('mall') ||
      categoryLower.includes('shopping') ||
      categoryLower.includes('market')
    ) {
      return 'shopping';
    }
    
    // 默认返回景点类型
    return 'attraction';
  }
}

