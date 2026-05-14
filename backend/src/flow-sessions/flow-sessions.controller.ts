import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { FlowSessionsService } from './flow-sessions.service';

type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
    email: string;
  };
};

@Controller('flows/:flowId/sessions')
@UseGuards(OptionalJwtAuthGuard)
export class FlowSessionsController {
  constructor(private readonly flowSessionsService: FlowSessionsService) {}

  @Post()
  create(@Param('flowId') flowId: string, @Req() req: AuthenticatedRequest) {
    return this.flowSessionsService.create(flowId, req.user?.sub);
  }

  @Post(':sessionId/advance')
  advance(
    @Param('flowId') flowId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      selectedEdgeId?: string;
      numericValue?: number;
      textValue?: string;
    },
  ) {
    return this.flowSessionsService.advance(
      flowId,
      sessionId,
      req.user?.sub,
      body?.selectedEdgeId,
      body?.numericValue,
      body?.textValue,
    );
  }

  @Post(':sessionId/back')
  goBack(
    @Param('flowId') flowId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.flowSessionsService.goBack(flowId, sessionId, req.user?.sub);
  }
}
