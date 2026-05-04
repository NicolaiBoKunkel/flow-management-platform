import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FlowSessionsModule } from './flow-sessions/flow-sessions.module';
import { FlowsModule } from './flows/flows.module';
import { GraphAnalysisModule } from './graph-analysis/graph-analysis.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    Neo4jModule,
    AuthModule,
    FlowsModule,
    FlowSessionsModule,
    GraphAnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
