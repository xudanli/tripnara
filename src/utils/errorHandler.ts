import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';

/**
 * 统一的错误处理工具类
 * 提供一致的错误消息格式和上下文信息
 */
export class ErrorHandler {
  /**
   * 创建资源不存在的错误
   */
  static notFound(
    resourceType: string,
    identifier: string | number,
    context?: Record<string, unknown>,
  ): NotFoundException {
    const message = `${resourceType}不存在: ${identifier}`;
    const error = new NotFoundException(message);
    if (context) {
      (error as any).context = context;
    }
    return error;
  }

  /**
   * 创建权限不足的错误
   */
  static forbidden(
    action: string,
    resourceType: string = '此资源',
    context?: Record<string, unknown>,
  ): ForbiddenException {
    const message = `无权${action}${resourceType}`;
    const error = new ForbiddenException(message);
    if (context) {
      (error as any).context = context;
    }
    return error;
  }

  /**
   * 创建请求参数错误
   */
  static badRequest(
    message: string,
    context?: Record<string, unknown>,
  ): BadRequestException {
    const error = new BadRequestException(message);
    if (context) {
      (error as any).context = context;
    }
    return error;
  }

  /**
   * 创建数据验证错误
   */
  static validationError(
    field: string,
    reason: string,
    context?: Record<string, unknown>,
  ): BadRequestException {
    const message = `数据验证失败: ${field} - ${reason}`;
    const error = new BadRequestException(message);
    if (context) {
      (error as any).context = { field, reason, ...context };
    }
    return error;
  }

  /**
   * 包装并增强错误信息
   */
  static wrapError(
    error: Error | HttpException,
    operation: string,
    context?: Record<string, unknown>,
  ): HttpException {
    if (error instanceof HttpException) {
      // 如果是 HttpException，添加上下文信息
      const response = error.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as any)?.message || error.message;
      const enhancedMessage = `${operation}时发生错误: ${message}`;
      const enhancedError = new (error.constructor as any)(
        enhancedMessage,
        error.getStatus(),
      );
      if (context) {
        (enhancedError as any).context = {
          ...((error as any).context || {}),
          ...context,
        };
      }
      return enhancedError;
    }

    // 如果是普通 Error，转换为 BadRequestException
    const message = `${operation}时发生错误: ${error.message}`;
    const httpError = new BadRequestException(message);
    if (context) {
      (httpError as any).context = context;
    }
    return httpError;
  }
}

