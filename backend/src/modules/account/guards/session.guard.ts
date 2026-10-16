import { Request } from 'express';

import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { TypedConfigService } from '@common/config/app-config';
import { IJwtPayload } from '@common/constants';
import { decryptUuid } from '@common/utils/crypt-utils';

export interface ISessionUser {
    shortUuid: string;
    subpageConfigUuid: string;
}

export type TRequestWithSession = Request & {
    cookies?: Record<string, string | undefined>;
    session?: ISessionUser;
};

/**
 * Authenticates account API calls with the same httpOnly `session` cookie that the
 * webpage issues. The cookie carries the (encrypted) shortUuid the page was opened
 * with, so the API can only ever act on that single subscription.
 */
@Injectable()
export class SessionGuard implements CanActivate {
    private readonly logger = new Logger(SessionGuard.name);
    private readonly internalJwtSecret: string;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: TypedConfigService,
    ) {
        this.internalJwtSecret = this.configService.getOrThrow('INTERNAL_JWT_SECRET');
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<TRequestWithSession>();
        const token = request.cookies?.session;

        if (!token) {
            throw new UnauthorizedException({
                code: 'SESSION_EXPIRED',
                message: 'Session cookie is missing',
            });
        }

        let payload: IJwtPayload;

        try {
            payload = this.jwtService.verify<IJwtPayload>(token);
        } catch (error) {
            this.logger.debug(`Session cookie rejected: ${error}`);

            throw new UnauthorizedException({
                code: 'SESSION_EXPIRED',
                message: 'Session is expired or invalid',
            });
        }

        const shortUuid = payload.uid ? decryptUuid(payload.uid, this.internalJwtSecret) : null;
        const subpageConfigUuid = decryptUuid(payload.su, this.internalJwtSecret);

        if (!shortUuid || !subpageConfigUuid) {
            throw new UnauthorizedException({
                code: 'SESSION_EXPIRED',
                message: 'Session does not carry a subscription identity',
            });
        }

        request.session = { shortUuid, subpageConfigUuid };

        return true;
    }
}
