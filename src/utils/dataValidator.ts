/**
 * 数据验证和修复工具类
 * 确保后端返回的数据格式始终正确，前端无需进行数据修复
 */
export class DataValidator {
  /**
   * 验证并修复数值字段
   * @param value 原始值
   * @param defaultValue 默认值（如果转换失败）
   * @param min 最小值（可选）
   * @returns 修复后的数值
   */
  static fixNumber(
    value: any,
    defaultValue: number = 0,
    min: number = 0,
  ): number {
    // 如果已经是数字
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : Math.max(min, value);
    }

    // 如果是字符串，尝试转换
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return Math.max(min, parsed);
      }
    }

    // 如果是null或undefined，返回默认值
    if (value == null) {
      return defaultValue;
    }

    // 其他情况，尝试Number转换
    const num = Number(value);
    return isNaN(num) ? defaultValue : Math.max(min, num);
  }

  /**
   * 验证并修复字符串字段
   * @param value 原始值
   * @param defaultValue 默认值（如果为空）
   * @returns 修复后的字符串
   */
  static fixString(value: any, defaultValue: string = ''): string {
    if (typeof value === 'string') {
      return value.trim() || defaultValue;
    }
    if (value == null) {
      return defaultValue;
    }
    return String(value).trim() || defaultValue;
  }

  /**
   * 验证并修复时间格式
   * @param value 原始值
   * @param defaultValue 默认值
   * @returns 修复后的时间字符串（HH:mm格式）
   */
  static fixTime(value: any, defaultValue: string = '09:00'): string {
    const str = this.fixString(value, defaultValue);

    // 验证格式：HH:mm
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(str)) {
      return str;
    }

    // 尝试修复常见格式
    // 如 "9:0" -> "09:00", "9:00" -> "09:00"
    const parts = str.split(':');
    if (parts.length === 2) {
      const hour = parts[0].padStart(2, '0');
      const minute = parts[1].padStart(2, '0');
      const fixed = `${hour}:${minute}`;
      if (timeRegex.test(fixed)) {
        return fixed;
      }
    }

    return defaultValue;
  }

  /**
   * 验证并修复日期格式
   * @param value 原始值
   * @param defaultValue 默认值（可选，如果不提供则使用今天）
   * @returns 修复后的日期字符串（YYYY-MM-DD格式）
   */
  static fixDate(value: any, defaultValue?: string): string {
    if (typeof value === 'string') {
      // 验证ISO 8601格式：YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(value)) {
        // 验证日期是否有效
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return value;
        }
      }
    }

    // 如果是Date对象
    if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        return value.toISOString().split('T')[0];
      }
    }

    // 使用默认值或今天
    if (defaultValue) {
      return defaultValue;
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 验证活动类型
   * @param value 原始值
   * @param defaultValue 默认值
   * @returns 修复后的活动类型
   */
  static fixActivityType(
    value: any,
    defaultValue: string = 'attraction',
  ): string {
    const validTypes = [
      'attraction',
      'sightseeing',
      'restaurant',
      'food',
      'dining',
      'cafe',
      'bar',
      'accommodation',
      'hotel',
      'hostel',
      'shopping',
      'market',
      'transport',
      'transportation',
      'transfer',
      'adventure',
      'sports',
      'nature',
      'outdoor',
      'wellness',
      'spa',
      'workshop',
      'show',
      'performance',
      'meal',
      'ocean',
    ];

    const str = this.fixString(value, defaultValue).toLowerCase();
    return validTypes.includes(str) ? str : defaultValue;
  }
}

