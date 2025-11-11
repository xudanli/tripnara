import { Injectable } from '@nestjs/common';
import { HighAltitudeResponseDto } from '../dto/destination.dto';

@Injectable()
export class AltitudeService {
  evaluateDestination(name: string): HighAltitudeResponseDto {
    const normalized = name.toLowerCase();
    const isHigh =
      normalized.includes('mountain') || normalized.includes('altiplano');

    return {
      name,
      isHighAltitude: isHigh,
      category: isHigh ? 'high' : 'low',
      note: isHigh
        ? 'Sample data: destinations containing "mountain" are flagged as high altitude.'
        : 'Sample data: altitude information not yet connected to live datasets.',
    };
  }
}
