import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  GoogleAuthRequestDto,
  AuthResponseDto,
  UserProfileDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @ApiOperation({ summary: 'Google OAuth 登录' })
  async googleLogin(
    @Body() dto: GoogleAuthRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.googleLogin(dto.token);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户信息' })
  async getProfile(@CurrentUser() user: { userId: string }): Promise<UserProfileDto> {
    return this.authService.getCurrentUser(user.userId);
  }
}

