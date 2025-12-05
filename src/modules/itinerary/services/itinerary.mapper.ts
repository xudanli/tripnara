import { Injectable } from '@nestjs/common';
import {
  ItineraryDetailWithTimeSlotsDto,
  ItineraryTimeSlotDto,
  ItineraryDayWithTimeSlotsDto,
  ItineraryActivityDto,
} from '../dto/itinerary.dto';
import { DataValidator } from '../../../utils/dataValidator';

/**
 * 行程数据映射器
 * 负责实体与 DTO 之间的转换，以及数据简化
 */
@Injectable()
export class ItineraryMapper {
  /**
   * 判断是否为中文
   */
  private isChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  /**
   * 判断是否为英文
   */
  private isEnglish(text: string): boolean {
    return /^[a-zA-Z\s]+$/.test(text);
  }
  /**
   * 将活动列表转换为时间段列表（匹配 ItineraryService 的实现）
   */
  convertActivitiesToTimeSlots(
    activities: ItineraryActivityDto[],
    dayId?: string,
    activityIds?: string[],
  ): ItineraryTimeSlotDto[] {
    if (!activities || activities.length === 0) {
      return [];
    }

    return activities.map((act, index) => {
      // 使用 DataValidator 修复所有字段
      const fixedTitle = DataValidator.fixString(act.title, '未命名活动');
      const fixedNotes = DataValidator.fixString(act.notes, '');

      // 构建 details 对象（包含 notes 和 description，用于前端兼容）
      const details: Record<string, unknown> = {
        notes: fixedNotes,
        description: fixedNotes,
        ...(act.details || {}),
      };

      // 从 details 中提取多语言字段
      const detailsName = (act.details as any)?.name;
      const detailsAddress = (act.details as any)?.address;
      const locationDetails = (act.details as any)?.locationDetails;
      
      // 提取中文名称
      const chineseName = 
        detailsName?.chinese || 
        locationDetails?.chineseName || 
        (this.isChinese(fixedTitle) ? fixedTitle : undefined);
      
      // 提取英文名称
      const englishName = 
        detailsName?.english || 
        locationDetails?.englishName || 
        (this.isEnglish(fixedTitle) ? fixedTitle : undefined);
      
      // 提取目的地语言名称
      const destinationLanguageName = 
        detailsName?.local || 
        locationDetails?.localName || 
        locationDetails?.destinationLanguageName;
      
      // 提取位置名称
      const locationName = 
        detailsAddress?.chinese || 
        detailsAddress?.local || 
        locationDetails?.locationName || 
        (act as any).locationName || 
        (act as any).locationAddress;

      return {
        id: activityIds?.[index], // 活动ID（slotId，用于编辑/删除）
        dayId: dayId, // 天数ID（用于编辑/删除）
        time: DataValidator.fixTime(act.time, '09:00'),
        title: fixedTitle,
        activity: fixedTitle, // 与 title 相同，保留以兼容前端
        type: DataValidator.fixActivityType(act.type, 'attraction') as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        // FIX: Ensure it returns undefined instead of null
        coordinates: act.location ?? undefined, // 统一使用 coordinates 而不是 location
        notes: fixedNotes,
        duration: DataValidator.fixNumber(act.duration, 60, 1), // 至少1分钟
        cost: DataValidator.fixNumber(act.cost, 0, 0),
        details,
        chineseName,
        englishName,
        destinationLanguageName,
        locationName,
      };
    });
  }

  /**
   * 简化行程数据，用于传递给 AI（减少 Token 消耗）
   * 只保留 AI 理解行程所需的关键字段
   */
  simplifyItineraryForAI(
    itineraryDetail: ItineraryDetailWithTimeSlotsDto,
  ): string {
    const simplified = {
      destination: itineraryDetail.destination,
      daysCount: itineraryDetail.daysCount,
      days: itineraryDetail.days?.map((day) => ({
        day: day.day,
        date: day.date,
        timeSlots: day.timeSlots?.map((slot) => ({
          id: slot.id,
          time: slot.time,
          title: slot.title,
          type: slot.type,
          location: slot.coordinates
            ? `${slot.coordinates.lat},${slot.coordinates.lng}`
            : undefined,
          notes: slot.notes ? slot.notes.substring(0, 200) : undefined, // 限制 notes 长度
          cost: slot.cost,
        })),
      })),
    };

    return JSON.stringify(simplified, null, 2);
  }
}

