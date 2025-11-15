import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Request, Response } from 'express';
import { UserProfileDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @ApiOperation({ summary: '跳转至 Google OAuth 登录' })
  async redirectToGoogle(@Res() res: Response) {
    return this.authService.beginGoogleLogin(res);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth 回调' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      res.status(400).send('缺少必要的 code 或 state');
      return;
    }
    await this.authService.handleGoogleCallback(code, state, req, res);
  }

  @Get('me')
  @ApiOperation({ summary: '读取当前登录用户信息（基于 app_session）' })
  async getMe(@Req() req: Request): Promise<UserProfileDto> {
    return this.authService.getProfileFromSession(req);
  }

  @Post('logout')
  @ApiOperation({ summary: '退出登录并清理会话' })
  async logout(@Res() res: Response) {
    return this.authService.logout(res);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户信息' })
  async getProfile(@CurrentUser() user: { userId: string }): Promise<UserProfileDto> {
    return this.authService.getCurrentUser(user.userId);
  }
}

