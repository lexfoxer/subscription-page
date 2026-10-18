import type { ISessionUser } from './guards/session.guard';
import type { TDeleteDeviceBody, TSetExternalSquadBody } from './schemas/account.schemas';

import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';

import { ClientIp } from '@common/decorators/get-ip';
import { SessionUser } from '@common/decorators/get-session-user';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';

import { AccountService } from './account.service';
import { SessionGuard } from './guards/session.guard';
import { DeleteDeviceBodySchema, SetExternalSquadBodySchema } from './schemas/account.schemas';

export const ACCOUNT_API_PREFIX = 'api/account';

@Controller(ACCOUNT_API_PREFIX)
@UseGuards(SessionGuard)
export class AccountController {
    constructor(private readonly accountService: AccountService) {}

    @Get('settings')
    async getSettings(@ClientIp() clientIp: string, @SessionUser() session: ISessionUser) {
        return this.accountService.getSettings(clientIp, session.shortUuid);
    }

    @Get('traffic-reset')
    async getTrafficReset(@ClientIp() clientIp: string, @SessionUser() session: ISessionUser) {
        return this.accountService.getTrafficReset(clientIp, session.shortUuid);
    }

    @Post('external-squad')
    @HttpCode(200)
    async setExternalSquad(
        @ClientIp() clientIp: string,
        @SessionUser() session: ISessionUser,
        @Body(new ZodValidationPipe(SetExternalSquadBodySchema)) body: TSetExternalSquadBody,
    ) {
        return this.accountService.setExternalSquad(
            clientIp,
            session.shortUuid,
            body.externalSquadUuid,
        );
    }

    @Get('devices')
    async getDevices(@ClientIp() clientIp: string, @SessionUser() session: ISessionUser) {
        return this.accountService.getDevices(clientIp, session.shortUuid);
    }

    @Post('devices/delete')
    @HttpCode(200)
    async deleteDevice(
        @ClientIp() clientIp: string,
        @SessionUser() session: ISessionUser,
        @Body(new ZodValidationPipe(DeleteDeviceBodySchema)) body: TDeleteDeviceBody,
    ) {
        return this.accountService.deleteDevice(clientIp, session.shortUuid, body.hwid);
    }

    @Post('reset-traffic')
    @HttpCode(200)
    async resetTraffic(@ClientIp() clientIp: string, @SessionUser() session: ISessionUser) {
        return this.accountService.resetTraffic(clientIp, session.shortUuid);
    }
}
