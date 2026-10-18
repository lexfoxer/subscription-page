import { Request, Response, NextFunction } from 'express';

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

import { REQUEST_TEMPLATE_TYPE_VALUES } from '@remnawave/backend-contract';

import { TypedConfigService } from '@common/config/app-config';
import { rejectRequest } from '@common/utils/reject-request';

import { ACCOUNT_SETTINGS_PATH_SEGMENT } from '../subscription.constants';

@Injectable()
export class ClientTypeMiddleware implements NestMiddleware {
    private readonly logger = new Logger(ClientTypeMiddleware.name);
    private readonly allowedClientTypes: ReadonlySet<string> = new Set(
        REQUEST_TEMPLATE_TYPE_VALUES,
    );
    private readonly stealthMode: boolean;

    constructor(private readonly configService: TypedConfigService) {
        this.stealthMode = this.configService.getOrThrow('STEALTH_MODE');
    }

    use(req: Request, res: Response, next: NextFunction) {
        const clientType = req.params.clientType;

        // `/<shortUuid>/settings` is a webpage route (account settings), not a client template.
        if (clientType === ACCOUNT_SETTINGS_PATH_SEGMENT) {
            next();
            return;
        }

        if (clientType && !this.allowedClientTypes.has(clientType)) {
            this.logger.error(`Invalid client type: ${clientType}`);

            rejectRequest(res, this.stealthMode, 404, 'Unknown client type');
            return;
        }

        next();
    }
}
