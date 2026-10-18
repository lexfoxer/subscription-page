import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

import { Logger } from '@nestjs/common';

import { IJwtPayload } from '@common/constants';
import { rejectRequest } from '@common/utils/reject-request';

const logger = new Logger('CheckAssetsCookieMiddleware');

export function createCheckAssetsCookieMiddleware(stealthMode: boolean) {
    return function checkAssetsCookieMiddleware(
        req: { user: IJwtPayload } & Request,
        res: Response,
        next: NextFunction,
    ) {
        const secret = process.env.INTERNAL_JWT_SECRET;

        if (!secret) {
            logger.error('INTERNAL_JWT_SECRET is not set');
            rejectRequest(res, stealthMode, 500, 'Server misconfigured');
            return;
        }

        if (!req.cookies.session) {
            logger.debug('No session cookie found');
            rejectRequest(res, stealthMode, 401, 'Session cookie is required');
            return;
        }

        try {
            const jwtPayload = jwt.verify(req.cookies.session, secret);

            req.user = jwtPayload as unknown as IJwtPayload;
        } catch (error) {
            logger.debug(error);
            rejectRequest(res, stealthMode, 401, 'Session is expired or invalid');
            return;
        }

        return next();
    };
}
