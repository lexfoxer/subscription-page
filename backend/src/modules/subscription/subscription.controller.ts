import { Request, Response } from 'express';

import { Get, Controller, Res, Req, Param, Logger } from '@nestjs/common';

import { TRequestTemplateTypeKeys } from '@remnawave/backend-contract';

import { TypedConfigService } from '@common/config/app-config';
import { ClientIp } from '@common/decorators/get-ip';
import { ResolvedShortUuid } from '@common/decorators/get-resolved-short-uuid';
import { IsBrowser } from '@common/decorators/is-browser';
import { rejectRequest } from '@common/utils/reject-request';

import { WebpageService } from '@modules/webpage/webpage.service';

import { ACCOUNT_SETTINGS_PATH_SEGMENT } from './subscription.constants';
import { SubscriptionService } from './subscription.service';

@Controller()
export class SubscriptionController {
    private readonly logger = new Logger(SubscriptionController.name);

    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly webpageService: WebpageService,
        private readonly configService: TypedConfigService,
    ) {}

    @Get([':shortUuid', ':shortUuid/:clientType'])
    async root(
        @ClientIp() clientIp: string,
        @ResolvedShortUuid() resolvedShortUuid: string | undefined | null,
        @Req() request: Request,
        @Res() response: Response,
        @Param('shortUuid') shortUuid: string,
        @Param('clientType') clientType: string,
        @IsBrowser() isBrowser: boolean,
    ) {
        if (isBrowser) {
            return this.webpageService.serveWebpage(
                clientIp,
                request,
                response,
                resolvedShortUuid ?? shortUuid,
            );
        }

        if (clientType === ACCOUNT_SETTINGS_PATH_SEGMENT) {
            // Settings page only exists in the browser; never serve it as a subscription.
            rejectRequest(
                response,
                this.configService.getOrThrow('STEALTH_MODE'),
                404,
                'Not found',
            );
            return;
        }

        return this.subscriptionService.serveSubscriptionPage(
            clientIp,
            request,
            response,
            resolvedShortUuid ?? shortUuid,
            clientType ? (clientType as TRequestTemplateTypeKeys) : undefined,
        );
    }
}
