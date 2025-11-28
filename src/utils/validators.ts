import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * 验证时间格式 (HH:mm)
 */
@ValidatorConstraint({ name: 'isTimeFormat', async: false })
export class IsTimeFormatConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} 必须是有效的时间格式 (HH:mm)，例如: 09:00`;
  }
}

/**
 * 验证时间格式装饰器
 */
export function IsTimeFormat(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimeFormatConstraint,
    });
  };
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
@ValidatorConstraint({ name: 'isDateFormat', async: false })
export class IsDateFormatConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return false;
    }
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} 必须是有效的日期格式 (YYYY-MM-DD)，例如: 2024-06-01`;
  }
}

/**
 * 验证日期格式装饰器
 */
export function IsDateFormat(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDateFormatConstraint,
    });
  };
}

/**
 * 验证坐标范围
 */
@ValidatorConstraint({ name: 'isValidCoordinates', async: false })
export class IsValidCoordinatesConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const { lat, lng } = value;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }
    // 纬度范围: -90 到 90
    // 经度范围: -180 到 180
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} 必须是有效的坐标对象，包含 lat (-90 到 90) 和 lng (-180 到 180)`;
  }
}

/**
 * 验证坐标装饰器
 */
export function IsValidCoordinates(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCoordinatesConstraint,
    });
  };
}

/**
 * 验证未来日期
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} 必须是今天或未来的日期`;
  }
}

/**
 * 验证未来日期装饰器
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

