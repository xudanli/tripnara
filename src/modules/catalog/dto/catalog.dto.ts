import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsObject, IsString } from 'class-validator';

export class TransportModeDto {
  @ApiProperty({ description: 'Unique identifier for the transport mode.' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Human readable label for the transport mode.' })
  @IsString()
  label!: string;
}

export class LlmParameterHintDto {
  @ApiProperty({ description: 'Name of the parameter.' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Description providing guidance for the parameter.',
  })
  @IsString()
  description!: string;
}

export class CatalogResponseDto {
  @ApiProperty({
    description: 'Supported transport modes.',
    type: () => [TransportModeDto],
  })
  @IsArray()
  @Type(() => TransportModeDto)
  transportModes!: TransportModeDto[];

  @ApiProperty({
    description: 'LLM parameter hints for front-end configuration.',
    type: () => [LlmParameterHintDto],
  })
  @IsArray()
  @Type(() => LlmParameterHintDto)
  llmParameterHints!: LlmParameterHintDto[];

  @ApiProperty({
    description: 'Curated constants for the TripMind experience.',
    type: Object,
  })
  @IsObject()
  constants!: Record<string, unknown>;
}
