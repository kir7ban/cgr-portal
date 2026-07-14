import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AudienceService } from './audience.service';
import { AudienceController } from './audience.controller';

@Module({
  imports: [DatabaseModule],
  providers: [AudienceService],
  controllers: [AudienceController],
  exports: [AudienceService],
})
export class AudienceModule {}
