import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { MediaService } from './media.service';
import {
  SearchImageRequestDto,
  SearchImageResponseDto,
  SearchVideoRequestDto,
  SearchVideoResponseDto,
  UploadMediaRequestDto,
  UploadMediaResponseDto,
  GetMediaResponseDto,
} from './dto/media.dto';

@ApiTags('Media V1')
@Controller('v1/media')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('search-image')
  @ApiOperation({
    summary: '搜索图片',
    description: '根据地点/关键词获取图片（代理 Unsplash/Pexels）',
  })
  async searchImage(
    @Body() dto: SearchImageRequestDto,
  ): Promise<SearchImageResponseDto> {
    return this.mediaService.searchImage(dto);
  }

  @Post('search-video')
  @ApiOperation({
    summary: '搜索视频',
    description: '搜索视频内容',
  })
  async searchVideo(
    @Body() dto: SearchVideoRequestDto,
  ): Promise<SearchVideoResponseDto> {
    return this.mediaService.searchVideo(dto);
  }

  @Post('upload')
  @ApiOperation({
    summary: '上传媒体',
    description: '保存媒体URL到数据库（如支持用户上传）',
  })
  async uploadMedia(
    @Body() dto: UploadMediaRequestDto,
  ): Promise<UploadMediaResponseDto> {
    return this.mediaService.uploadMedia(dto);
  }

  @Get(':mediaId')
  @ApiOperation({
    summary: '获取媒体详情',
    description: '获取媒体元信息/签名 URL',
  })
  @ApiParam({ name: 'mediaId', description: '媒体ID（UUID）' })
  async getMedia(@Param('mediaId') mediaId: string): Promise<GetMediaResponseDto> {
    return this.mediaService.getMediaById(mediaId);
  }
}

