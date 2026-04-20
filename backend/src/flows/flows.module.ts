import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FlowsController],
  providers: [FlowsService],
})
export class FlowsModule {}