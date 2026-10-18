process.title = 'rw-subpage';

import cookieParser from 'cookie-parser';
import { json, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import path from 'node:path';
import sirv from 'sirv';
import { createLogger } from 'winston';
import * as winston from 'winston';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { APP_CONFIG_ROUTE_WO_LEADING_PATH } from '@remnawave/subscription-page-types';

import { TypedConfigService } from '@common/config/app-config';
import { NotFoundExceptionFilter } from '@common/exception/not-found-exception.filter';
import {
    createCheckAssetsCookieMiddleware,
    createHeaderFilterMiddleware,
    createProxyCheckMiddleware,
    getRealIp,
    noRobotsMiddleware,
} from '@common/middlewares';
import { customLogFilter } from '@common/utils/filter-logs/filter-logs';
import { getAssetsPath, isDevelopment, isDevOrDebugLogsEnabled } from '@common/utils/startup-app';
import { getStartMessage } from '@common/utils/startup-app/get-start-message';

import { getAccountFeatures } from '@modules/account/account-features';

import { AppModule } from './app.module';

// const levels = {
//     error: 0,
//     warn: 1,
//     info: 2,
//     http: 3,
//     verbose: 4,
//     debug: 5,
//     silly: 6,
// };

const instanceId = process.env.INSTANCE_ID || '0';

const logger = createLogger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
        customLogFilter(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS',
        }),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike(`${instanceId}`, {
            colors: true,
            prettyPrint: true,
            processId: false,
            appName: true,
        }),
    ),
    level: isDevOrDebugLogsEnabled() ? 'debug' : 'http',
});

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: WinstonModule.createLogger({
            instance: logger,
        }),
    });

    const config = app.get(TypedConfigService);

    app.set('etag', false);
    app.disable('x-powered-by');

    app.set('trust proxy', config.getOrThrow('TRUST_PROXY'));

    const stealthMode = config.getOrThrow('STEALTH_MODE');

    app.use('/internal/health', (req: Request, res: Response, next: NextFunction) => {
        const ip = req.socket.remoteAddress ?? '';
        const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

        if (isLoopback && !req.headers['x-forwarded-for'] && req.path === '/') {
            res.status(200).type('text/plain').send('OK');
            return;
        }

        next();
    });

    if (!isDevelopment()) {
        app.use(createProxyCheckMiddleware(stealthMode));
    }

    // Session cookie is needed by /assets (static protection) and the account API (SessionGuard).
    app.use(cookieParser());
    app.use('/assets', createCheckAssetsCookieMiddleware(stealthMode));

    // Must run before headerFilterMiddleware: it strips `content-length`, after which the
    // body parser Nest registers later would treat every request as body-less.
    app.use(json({ limit: '16kb' }));

    app.use(noRobotsMiddleware, getRealIp, createHeaderFilterMiddleware(stealthMode));

    app.use(
        '/assets',
        sirv(path.join(getAssetsPath(), 'assets'), {
            maxAge: 604800, // 7 days
            immutable: true,
            etag: false,
            // dev: isDevelopment(),
        }),
    );

    app.use(helmet({ contentSecurityPolicy: false }));

    app.use(
        morgan(
            ':remote-addr - ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
            {
                skip: (req) => req?.url?.startsWith('/assets') ?? false,
            },
        ),
    );

    const customSubPrefix = config.get('CUSTOM_SUB_PREFIX');

    app.setGlobalPrefix(customSubPrefix ?? '', { exclude: [APP_CONFIG_ROUTE_WO_LEADING_PATH] });

    if (customSubPrefix) {
        logger.info('[CONFIG] CUSTOM_SUB_PREFIX: ' + customSubPrefix);
    } else {
        logger.info('[CONFIG] CUSTOM_SUB_PREFIX: not set');
    }

    app.useGlobalFilters(new NotFoundExceptionFilter(stealthMode));

    logger.info(
        `[CONFIG] STEALTH_MODE: ${stealthMode ? 'on (drop connections like upstream)' : 'off (answer with HTTP statuses)'}`,
    );

    app.enableCors({
        origin: '*',
        methods: 'GET',
        credentials: false,
    });

    const accountFeatures = getAccountFeatures(config);

    logger.info(
        `[CONFIG] Account settings page: ${accountFeatures.enabled ? 'enabled' : 'disabled'}` +
            ` (external squads: ${accountFeatures.externalSquads ? 'on' : 'off'},` +
            ` traffic reset: ${
                accountFeatures.trafficReset
                    ? `${config.getOrThrow('TRAFFIC_RESET_LIMIT_PER_MONTH')}/month`
                    : 'off'
            })`,
    );

    app.enableShutdownHooks();

    await app.listen(Number(config.getOrThrow('APP_PORT')));

    logger.info('\n' + (await getStartMessage()) + '\n');

    if (import.meta.webpackHot) {
        import.meta.webpackHot.accept();
        import.meta.webpackHot.dispose(() => app.close());
    }
}
void bootstrap();
