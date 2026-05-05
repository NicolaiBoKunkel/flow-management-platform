import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { GraphAnalysisService } from './graph-analysis.service';

type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
    email: string;
  };
};

@Controller('flows/:flowId/analysis')
export class GraphAnalysisController {
  constructor(private readonly graphAnalysisService: GraphAnalysisService) {}

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  syncFlowToNeo4j(
    @Param('flowId') flowId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.graphAnalysisService.syncFlowToNeo4j(flowId, req.user!.sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  analyzeFlow(
    @Param('flowId') flowId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.graphAnalysisService.analyzeFlow(flowId, req.user?.sub);
  }
}
