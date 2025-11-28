/**
 * 费用计算工具类
 * 用于自动计算行程总费用，确保前端无需进行费用计算
 */
export class CostCalculator {
  /**
   * 获取活动的费用
   * @param activity 活动对象
   * @returns 活动费用（数字）
   */
  static getActivityCost(activity: any): number {
    // 优先级1：直接费用字段
    if (activity.cost != null) {
      const cost = Number(activity.cost);
      if (!isNaN(cost) && cost > 0) {
        return cost;
      }
    }

    // 优先级2：通用价格
    if (activity.details?.pricing?.general != null) {
      const cost = Number(activity.details.pricing.general);
      if (!isNaN(cost) && cost > 0) {
        return cost;
      }
    }

    // 优先级3：预估费用
    if (activity.estimatedCost != null) {
      const cost = Number(activity.estimatedCost);
      if (!isNaN(cost) && cost > 0) {
        return cost;
      }
    }

    return 0;
  }

  /**
   * 计算一天的总费用
   * @param day 天数对象
   * @returns 该天的总费用
   */
  static calculateDayCost(day: any): number {
    if (!day.activities || !Array.isArray(day.activities)) {
      return 0;
    }

    return day.activities.reduce((sum: number, activity: any) => {
      return sum + this.getActivityCost(activity);
    }, 0);
  }

  /**
   * 计算行程的总费用
   * @param itinerary 行程对象（包含 days 数组）
   * @returns 总费用
   */
  static calculateTotalCost(itinerary: any): number {
    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      return 0;
    }

    return itinerary.days.reduce((sum: number, day: any) => {
      return sum + this.calculateDayCost(day);
    }, 0);
  }

  /**
   * 计算并更新行程总费用
   * @param itinerary 行程对象
   * @returns 更新后的行程对象（包含计算后的totalCost）
   */
  static calculateAndUpdateTotalCost(itinerary: any): any {
    const totalCost = this.calculateTotalCost(itinerary);
    return {
      ...itinerary,
      totalCost,
    };
  }
}

