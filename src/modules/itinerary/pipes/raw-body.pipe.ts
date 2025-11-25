import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * RawBodyPipe - 直接返回原始body，不进行任何验证
 * 用于需要接受多种格式的接口
 */
@Injectable()
export class RawBodyPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}

