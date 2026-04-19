import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FlowsModule } from './flows/flows.module';
import { PrismaModule } from './prisma/prisma.module';
import { FlowSessionsModule } from './flow-sessions/flow-sessions.module';

@Module({
  imports: [PrismaModule, FlowsModule, FlowSessionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}