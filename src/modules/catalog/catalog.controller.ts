import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './services/catalog.service';
import { CatalogResponseDto } from './dto/catalog.dto';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieve static reference catalog data for TripMind.',
  })
  @ApiOkResponse({ type: CatalogResponseDto })
  getCatalog(): CatalogResponseDto {
    return this.catalogService.getCatalog();
  }
}
