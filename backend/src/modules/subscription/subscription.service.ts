import { Request, Response } from 'express';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

import { TRequestTemplateTypeKeys } from '@remnawave/backend-contract';

import { AxiosService } from '@common/axios/axios.service';
import { TypedConfigService } from '@common/config/app-config';
import { rejectRequest } from '@common/utils/reject-request';

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name);
    private readonly stealthMode: boolean;

    constructor(
        private readonly axiosService: AxiosService,
        private readonly configService: TypedConfigService,
    ) {
        this.stealthMode = this.configService.getOrThrow('STEALTH_MODE');
    }

    public async serveSubscriptionPage(
        clientIp: string,
        req: Request,
        res: Response,
        shortUuid: string,
        clientType?: TRequestTemplateTypeKeys,
    ): Promise<void> {
        try {
            const result = await this.axiosService.getSubscription(
                clientIp,
                shortUuid,
                req.headers,
                !!clientType,
                clientType,
            );

            if (result.kind === 'not_found') {
                rejectRequest(res, this.stealthMode, 404, 'Not found');
                return;
            }

            if (result.kind === 'error') {
                rejectRequest(
                    res,
                    this.stealthMode,
                    503,
                    'Subscription is temporarily unavailable',
                );
                return;
            }

            if (result.headers) {
                res.set(result.headers);
            }

            res.status(200).send(result.subscription);
            return;
        } catch (error) {
            this.logger.error('Error in serveSubscriptionPage', error);

            rejectRequest(res, this.stealthMode, 500, 'Internal error');
            return;
        }
    }
}
