import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto/preferences.dto';

@ApiTags('User Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户偏好' })
  async getPreferences(@CurrentUser() user: { userId: string }) {
    const preferences = await this.preferencesService.getPreferences(
      user.userId,
    );
    return { preferences };
  }

  @Put()
  @ApiOperation({ summary: '更新当前用户偏好' })
  async updatePreferences(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdatePreferencesDto,
  ) {
    const preferences = await this.preferencesService.updatePreferences(
      user.userId,
      dto.preferences,
    );
    return { preferences };
  }
}

