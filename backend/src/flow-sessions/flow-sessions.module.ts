import { Module } from '@nestjs/common';
import { FlowSessionsController } from './flow-sessions.controller';
import { FlowSessionsService } from './flow-sessions.service';

@Module({
  controllers: [FlowSessionsController],
  providers: [FlowSessionsService],
})
export class FlowSessionsModule {}
