import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GraphAnalysisModule } from '../graph-analysis/graph-analysis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';

@Module({
  imports: [PrismaModule, AuthModule, GraphAnalysisModule],
  controllers: [FlowsController],
  providers: [FlowsService],
})
export class FlowsModule {}
