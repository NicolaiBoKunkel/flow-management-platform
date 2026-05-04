import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GraphAnalysisController } from './graph-analysis.controller';
import { GraphAnalysisService } from './graph-analysis.service';

@Module({
  imports: [PrismaModule, AuthModule, Neo4jModule],
  controllers: [GraphAnalysisController],
  providers: [GraphAnalysisService],
  exports: [GraphAnalysisService],
})
export class GraphAnalysisModule {}
