import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { AuditingService } from './auditing.service';

@Module({
  providers: [DatabaseService, AuditingService],
  exports: [DatabaseService, AuditingService],
})
export class DatabaseModule {}
