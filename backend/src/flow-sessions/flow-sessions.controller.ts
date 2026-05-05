import { Body, Controller, Param, Post } from '@nestjs/common';
import { FlowSessionsService } from './flow-sessions.service';

@Controller('flows/:flowId/sessions')
export class FlowSessionsController {
  constructor(private readonly flowSessionsService: FlowSessionsService) {}

  @Post()
  create(@Param('flowId') flowId: string) {
    return this.flowSessionsService.create(flowId);
  }

  @Post(':sessionId/advance')
  advance(
    @Param('flowId') flowId: string,
    @Param('sessionId') sessionId: string,
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
      body?.selectedEdgeId,
      body?.numericValue,
      body?.textValue,
    );
  }

  @Post(':sessionId/back')
  goBack(
    @Param('flowId') flowId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.flowSessionsService.goBack(flowId, sessionId);
  }
}
