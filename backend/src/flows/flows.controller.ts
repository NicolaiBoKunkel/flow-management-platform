import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { FlowsService } from './flows.service';

type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
    email: string;
  };
};

@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.flowsService.findAll(req.user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.flowsService.findMine(req.user!.sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.flowsService.findOne(id, req.user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createFlowDto: CreateFlowDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.flowsService.create(createFlowDto, req.user!.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFlowDto: UpdateFlowDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.flowsService.update(id, updateFlowDto, req.user!.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.flowsService.remove(id, req.user!.sub);
  }
}