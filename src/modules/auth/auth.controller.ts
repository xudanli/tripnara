import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserProfileDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @ApiOperation({ summary: '跳转至 Google OAuth 登录' })
  async redirectToGoogle(@Res() res: Response) {
    return this.authService.beginGoogleLogin(res);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth 回调处理 ' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log('[AuthController] /auth/google/callback hit', { code, state });
  
    if (!code || !state) {
      throw new BadRequestException('缺少必要的 code 或 state');
    }
  
    try {
      await this.authService.handleGoogleCallback(code, state, req, res);
    } catch (e: any) {
      console.error(
        '[AuthController] handleGoogleCallback error:',
        e?.response?.data ?? e,
      );
      throw e; // 让 Nest 正常返回 401/500 到浏览器
    }
  }  

  @Get('me')
  @ApiOperation({ summary: '读取当前登录用户信息（基于 app_session）' })
  async getMe(@Req() req: Request): Promise<UserProfileDto> {
    return this.authService.getProfileFromSession(req);
  }

  @Post('logout')
  @ApiOperation({ summary: '退出登录并清理会话' })
  async logout(@Res() res: Response) {
    const result = await this.authService.logout(res);
    return res.json(result);
  }
}
