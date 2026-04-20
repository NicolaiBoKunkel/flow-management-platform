import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FlowSessionsModule } from './flow-sessions/flow-sessions.module';
import { FlowsModule } from './flows/flows.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, FlowsModule, FlowSessionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}