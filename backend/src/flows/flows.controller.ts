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
import { ImportFlowDto } from './dto/import-flow.dto';
import { ShareFlowDto } from './dto/share-flow.dto';
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

  @UseGuards(JwtAuthGuard)
  @Post('import')
  importFlow(
    @Body() importFlowDto: ImportFlowDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.flowsService.importFlow(importFlowDto, req.user!.sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.flowsService.findOne(id, req.user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/export')
  exportFlow(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.flowsService.exportFlow(id, req.user!.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/access')
  getFlowAccessList(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.flowsService.getFlowAccessList(id, req.user!.sub);
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
  @Post(':id/access')
  shareFlow(
    @Param('id') id: string,
    @Body() shareFlowDto: ShareFlowDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.flowsService.shareFlow(id, shareFlowDto, req.user!.sub);
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

  @UseGuards(JwtAuthGuard)
  @Delete(':id/access/:accessId')
  removeFlowAccess(
    @Param('id') id: string,
    @Param('accessId') accessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.flowsService.removeFlowAccess(id, accessId, req.user!.sub);
  }
}
