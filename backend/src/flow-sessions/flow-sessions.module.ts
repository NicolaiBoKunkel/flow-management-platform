import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { FlowSessionsController } from './flow-sessions.controller';
import { FlowSessionsService } from './flow-sessions.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [FlowSessionsController],
  providers: [FlowSessionsService, OptionalJwtAuthGuard],
})
export class FlowSessionsModule {}
