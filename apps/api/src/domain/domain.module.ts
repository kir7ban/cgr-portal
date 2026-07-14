import { Module } from '@nestjs/common';
import { StateTransitionService } from './state-transition.service';

@Module({
  providers: [StateTransitionService],
  exports: [StateTransitionService],
})
export class DomainModule {}
