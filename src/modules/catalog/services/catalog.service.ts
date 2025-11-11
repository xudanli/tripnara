import { Injectable } from '@nestjs/common';
import { CatalogResponseDto } from '../dto/catalog.dto';

@Injectable()
export class CatalogService {
  getCatalog(): CatalogResponseDto {
    return {
      transportModes: [
        { id: 'air', label: 'Flight' },
        { id: 'rail', label: 'Train' },
        { id: 'road', label: 'Car / Coach' },
        { id: 'public_transit', label: 'Public Transit' },
        { id: 'walking', label: 'Walking' },
      ],
      llmParameterHints: [
        {
          name: 'tone',
          description:
            'Adjust the narrative tone (e.g., adventurous, romantic, family-friendly).',
        },
        {
          name: 'budgetLevel',
          description: 'Set expected spend level (budget, mid-range, premium).',
        },
        {
          name: 'pace',
          description:
            'Control activity density per day (relaxed, balanced, packed).',
        },
      ],
      constants: {
        supportedTripLengths: [3, 5, 7, 10, 14],
        defaultCurrency: 'USD',
        contentLocales: ['en', 'fr', 'es', 'ja'],
      },
    };
  }
}
