import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { EventbriteService } from './eventbrite.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Eventbrite')
@Controller('eventbrite')
export class EventbriteController {
  constructor(private readonly eventbriteService: EventbriteService) {}

  @Get('auth-url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取 Eventbrite 授权地址' })
  getAuthUrl(@CurrentUser() user: { userId: string }) {
    const url = this.eventbriteService.generateAuthUrl(user.userId);
    return { url };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Eventbrite OAuth 回调' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const redirectUrl = await this.eventbriteService.handleCallback(
        code,
        state,
      );
      return res.redirect(redirectUrl);
    } catch (error) {
      return res.redirect(this.eventbriteService.getFailureRedirectUrl());
    }
  }

  @Post('disconnect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '解除 Eventbrite 绑定' })
  async disconnect(@CurrentUser() user: { userId: string }) {
    await this.eventbriteService.disconnect(user.userId);
    return { success: true };
  }

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '查看当前用户 Eventbrite 绑定状态' })
  async status(@CurrentUser() user: { userId: string }) {
    return this.eventbriteService.getConnectionStatus(user.userId);
  }
}

