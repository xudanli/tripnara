import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @ApiOperation({ summary: 'Google OAuth 登录' })
  async googleLogin(
    @Body() body: { code: string; redirect?: string },
  ): Promise<any> {
    // 把前端传来的 code / redirect 转给 AuthService
    return this.authService.googleLogin(body.code, body.redirect);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户信息' })
  async getProfile(@Req() req): Promise<any> {
    // JwtAuthGuard 校验通过后，会在 req.user 里放 userId
    return this.authService.getCurrentUser(req.user.userId);
  }
}
