import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { getJWTConfig } from '@common/config/jwt/jwt.config';

import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { SessionGuard } from './guards/session.guard';
import { TrafficResetRepository } from './repositories/traffic-reset.repository';

@Module({
    imports: [JwtModule.registerAsync(getJWTConfig())],
    controllers: [AccountController],
    providers: [AccountService, TrafficResetRepository, SessionGuard],
})
export class AccountModule {}
