import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import {
    GetExternalSquadsCommand,
    GetSubscriptionInfoByShortUuidCommand,
    GetUserByShortUuidCommand,
} from '@remnawave/backend-contract';

import { AxiosService } from '@common/axios';
import { TExternalSquadsConfig, TypedConfigService } from '@common/config/app-config';

import { getAccountFeatures, IAccountFeatures } from './account-features';
import { parseExternalSquadName } from './external-squad-name';
import { TrafficResetRepository } from './repositories/traffic-reset.repository';
import {
    IAccountSettings,
    IExternalSquadOption,
    TAccountErrorCode,
} from './schemas/account.schemas';

type TRemnawaveUser = GetUserByShortUuidCommand.Response['response'];
type TSubscriptionInfo = GetSubscriptionInfoByShortUuidCommand.Response['response'];
type TExternalSquad = GetExternalSquadsCommand.Response['response']['externalSquads'][number];

export interface IAccountMutationResult {
    settings: IAccountSettings;
    subscription: TSubscriptionInfo | null;
}

const EXTERNAL_SQUADS_CACHE_TTL_MS = 60_000;

@Injectable()
export class AccountService {
    private readonly logger = new Logger(AccountService.name);
    private readonly features: IAccountFeatures;
    private readonly squadsConfig: TExternalSquadsConfig;
    private readonly allowDefaultSquad: boolean;
    private readonly resetLimit: number;

    private externalSquadsCache: { fetchedAt: number; squads: Map<string, TExternalSquad> } | null =
        null;

    constructor(
        private readonly configService: TypedConfigService,
        private readonly axiosService: AxiosService,
        private readonly trafficResetRepository: TrafficResetRepository,
    ) {
        this.features = getAccountFeatures(configService);
        this.squadsConfig = configService.getOrThrow('EXTERNAL_SQUADS_SELECTABLE');
        this.allowDefaultSquad = configService.getOrThrow('EXTERNAL_SQUADS_ALLOW_DEFAULT');
        this.resetLimit = configService.getOrThrow('TRAFFIC_RESET_LIMIT_PER_MONTH');
    }

    public async getSettings(clientIp: string, shortUuid: string): Promise<IAccountSettings> {
        const user = await this.fetchUser(clientIp, shortUuid);

        return this.buildSettings(user);
    }

    public async setExternalSquad(
        clientIp: string,
        shortUuid: string,
        externalSquadUuid: string | null,
    ): Promise<IAccountMutationResult> {
        this.assertFeature(this.features.externalSquads);

        if (externalSquadUuid === null && !this.allowDefaultSquad) {
            throw this.error(
                'EXTERNAL_SQUAD_NOT_ALLOWED',
                'Switching back to the default squad is not allowed',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (externalSquadUuid !== null) {
            // A squad created a moment ago may not be in the cache yet: look it up fresh.
            const options = await this.getSelectableSquads(!this.hasCachedSquad(externalSquadUuid));

            if (!options.some((option) => option.uuid === externalSquadUuid)) {
                throw this.error(
                    'EXTERNAL_SQUAD_NOT_ALLOWED',
                    'This external squad cannot be selected',
                    HttpStatus.BAD_REQUEST,
                );
            }
        }

        let user = await this.fetchUser(clientIp, shortUuid);

        if (user.externalSquadUuid !== externalSquadUuid) {
            const updated = await this.axiosService.updateUserExternalSquad(
                clientIp,
                user.id,
                externalSquadUuid,
            );

            if (!updated.isOk || !updated.response) {
                throw this.error(
                    'REMNAWAVE_ERROR',
                    'Remnawave rejected the external squad change',
                    HttpStatus.BAD_GATEWAY,
                );
            }

            this.logger.log(
                `User ${user.username} (#${user.id}) switched external squad ${user.externalSquadUuid ?? 'default'} -> ${externalSquadUuid ?? 'default'}`,
            );

            user = updated.response;
        }

        return {
            settings: await this.buildSettings(user),
            subscription: await this.fetchSubscriptionInfo(clientIp, shortUuid),
        };
    }

    public async resetTraffic(
        clientIp: string,
        shortUuid: string,
    ): Promise<IAccountMutationResult> {
        this.assertFeature(this.features.trafficReset);

        let user = await this.fetchUser(clientIp, shortUuid);

        const blockedReason = this.getResetBlockedReason(user);

        if (blockedReason === 'USER_NOT_ACTIVE') {
            throw this.error(
                'USER_NOT_ACTIVE',
                'Traffic can only be reset for active subscriptions',
                HttpStatus.CONFLICT,
            );
        }

        if (blockedReason === 'NO_TRAFFIC_LIMIT') {
            throw this.error(
                'NO_TRAFFIC_LIMIT',
                'This subscription has unlimited traffic',
                HttpStatus.CONFLICT,
            );
        }

        const reservationId = this.trafficResetRepository.reserve(
            user.id,
            shortUuid,
            this.resetLimit,
        );

        if (reservationId === null) {
            throw this.error(
                'LIMIT_REACHED',
                'Monthly traffic reset limit reached',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const reset = await this.axiosService.resetUserTraffic(clientIp, user.id);

        if (!reset.isOk || !reset.response) {
            this.trafficResetRepository.release(reservationId);

            throw this.error(
                'REMNAWAVE_ERROR',
                'Remnawave rejected the traffic reset',
                HttpStatus.BAD_GATEWAY,
            );
        }

        this.logger.log(`User ${user.username} (#${user.id}) reset traffic via subscription page`);

        user = reset.response;

        return {
            settings: await this.buildSettings(user),
            subscription: await this.fetchSubscriptionInfo(clientIp, shortUuid),
        };
    }

    private async buildSettings(user: TRemnawaveUser): Promise<IAccountSettings> {
        const externalSquads = await this.buildExternalSquadsSection(user);
        const trafficReset = this.buildTrafficResetSection(user);

        return {
            user: {
                username: user.username,
                status: user.status,
                trafficUsedBytes: user.userTraffic.usedTrafficBytes,
                trafficLimitBytes: user.trafficLimitBytes,
                trafficLimitStrategy: user.trafficLimitStrategy,
                lastTrafficResetAt: user.lastTrafficResetAt
                    ? new Date(user.lastTrafficResetAt).toISOString()
                    : null,
            },
            externalSquads,
            trafficReset,
        };
    }

    private async buildExternalSquadsSection(
        user: TRemnawaveUser,
    ): Promise<IAccountSettings['externalSquads']> {
        if (!this.features.externalSquads) {
            return { enabled: false, allowDefault: false, current: null, options: [] };
        }

        const options = await this.getSelectableSquads();

        let current: IExternalSquadOption | null = null;

        if (user.externalSquadUuid) {
            const remote = (await this.getRemnawaveExternalSquads()).get(user.externalSquadUuid);

            current = options.find((option) => option.uuid === user.externalSquadUuid) ?? {
                uuid: user.externalSquadUuid,
                name: remote ? parseExternalSquadName(remote.name).displayName : 'Custom',
                platforms: [],
            };
        }

        return {
            enabled: true,
            allowDefault: this.allowDefaultSquad,
            current,
            options,
        };
    }

    /** Squads a user may pick, resolved according to EXTERNAL_SQUADS_SELECTABLE. */
    private async getSelectableSquads(forceRefresh = false): Promise<IExternalSquadOption[]> {
        const remnawaveSquads = await this.getRemnawaveExternalSquads(forceRefresh);
        const options: IExternalSquadOption[] = [];

        switch (this.squadsConfig.mode) {
            case 'disabled':
                return options;

            case 'auto': {
                const sorted = [...remnawaveSquads.values()].sort(
                    (a, b) => a.viewPosition - b.viewPosition,
                );

                for (const squad of sorted) {
                    const parsed = parseExternalSquadName(squad.name);

                    if (!parsed.selectable) continue;

                    if (parsed.unknownTags.length > 0) {
                        this.logger.warn(
                            `External squad "${squad.name}" has unknown tags: ${parsed.unknownTags.join(', ')} (ignored)`,
                        );
                    }

                    options.push({
                        uuid: squad.uuid,
                        name: parsed.displayName,
                        platforms: parsed.platforms,
                    });
                }

                return options;
            }

            case 'list': {
                for (const squad of this.squadsConfig.squads) {
                    const remote = remnawaveSquads.get(squad.uuid);

                    if (!remote) {
                        this.logger.warn(
                            `External squad ${squad.uuid} from EXTERNAL_SQUADS_SELECTABLE does not exist in Remnawave, skipping`,
                        );
                        continue;
                    }

                    options.push({
                        uuid: squad.uuid,
                        name: squad.label ?? remote.name,
                        platforms: squad.platforms,
                    });
                }

                return options;
            }
        }
    }

    private buildTrafficResetSection(user: TRemnawaveUser): IAccountSettings['trafficReset'] {
        const now = new Date();

        if (!this.features.trafficReset) {
            const period = this.trafficResetRepository.getPeriod(now);

            return {
                enabled: false,
                limit: 0,
                used: 0,
                remaining: 0,
                periodStart: period.start.toISOString(),
                periodEnd: period.end.toISOString(),
                blockedReason: null,
            };
        }

        const usage = this.trafficResetRepository.getUsage(user.id, now);
        const remaining = Math.max(0, this.resetLimit - usage.used);

        return {
            enabled: true,
            limit: this.resetLimit,
            used: usage.used,
            remaining,
            periodStart: usage.period.start.toISOString(),
            periodEnd: usage.period.end.toISOString(),
            blockedReason:
                this.getResetBlockedReason(user) ?? (remaining === 0 ? 'LIMIT_REACHED' : null),
        };
    }

    private getResetBlockedReason(
        user: TRemnawaveUser,
    ): 'NO_TRAFFIC_LIMIT' | 'USER_NOT_ACTIVE' | null {
        if (user.status !== 'ACTIVE' && user.status !== 'LIMITED') {
            return 'USER_NOT_ACTIVE';
        }

        if (user.trafficLimitBytes === 0) {
            return 'NO_TRAFFIC_LIMIT';
        }

        return null;
    }

    private hasCachedSquad(uuid: string): boolean {
        return this.externalSquadsCache?.squads.has(uuid) ?? false;
    }

    private async getRemnawaveExternalSquads(
        forceRefresh = false,
    ): Promise<Map<string, TExternalSquad>> {
        const now = Date.now();

        if (
            !forceRefresh &&
            this.externalSquadsCache &&
            now - this.externalSquadsCache.fetchedAt < EXTERNAL_SQUADS_CACHE_TTL_MS
        ) {
            return this.externalSquadsCache.squads;
        }

        const result = await this.axiosService.getExternalSquads();

        if (!result.isOk || !result.response) {
            if (this.externalSquadsCache) {
                this.logger.warn('Using stale external squads list: Remnawave request failed');
                return this.externalSquadsCache.squads;
            }

            throw this.error(
                'REMNAWAVE_ERROR',
                'Cannot load external squads from Remnawave',
                HttpStatus.BAD_GATEWAY,
            );
        }

        const squads = new Map(result.response.externalSquads.map((squad) => [squad.uuid, squad]));

        this.externalSquadsCache = { fetchedAt: now, squads };

        return squads;
    }

    private async fetchUser(clientIp: string, shortUuid: string): Promise<TRemnawaveUser> {
        const result = await this.axiosService.getUserByShortUuid(clientIp, shortUuid);

        if (!result.isOk || !result.response) {
            if (result.code === '404') {
                throw this.error('USER_NOT_FOUND', 'Subscription not found', HttpStatus.NOT_FOUND);
            }

            throw this.error(
                'REMNAWAVE_ERROR',
                'Cannot load subscription from Remnawave',
                HttpStatus.BAD_GATEWAY,
            );
        }

        return result.response;
    }

    private async fetchSubscriptionInfo(
        clientIp: string,
        shortUuid: string,
    ): Promise<TSubscriptionInfo | null> {
        const result = await this.axiosService.getSubscriptionInfo(clientIp, shortUuid);

        if (!result.isOk || !result.response) {
            return null;
        }

        return result.response.response;
    }

    private assertFeature(enabled: boolean): void {
        if (!enabled) {
            throw this.error('FEATURE_DISABLED', 'This feature is disabled', HttpStatus.FORBIDDEN);
        }
    }

    private error(code: TAccountErrorCode, message: string, status: HttpStatus): HttpException {
        // Plain HttpException on purpose: NotFoundException is swallowed by the global
        // NotFoundExceptionFilter (it drops the socket), while the API must answer with JSON.
        return new HttpException({ code, message }, status);
    }
}
