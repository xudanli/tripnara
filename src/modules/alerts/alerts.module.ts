import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelAlertEntity } from '../persistence/entities/reference.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TravelAlertEntity]),
    AuthModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

