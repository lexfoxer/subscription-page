import { z } from 'zod';

export const SetExternalSquadBodySchema = z.object({
    externalSquadUuid: z.uuid().nullable(),
});

export type TSetExternalSquadBody = z.infer<typeof SetExternalSquadBodySchema>;

export const SELECTABLE_PLATFORM_KEYS = [
    'ios',
    'android',
    'linux',
    'macos',
    'windows',
    'androidTV',
    'appleTV',
] as const;

export type TSelectablePlatformKey = (typeof SELECTABLE_PLATFORM_KEYS)[number];

export interface IExternalSquadOption {
    uuid: string;
    name: string;
    platforms: TSelectablePlatformKey[];
}

export interface IAccountSettings {
    user: {
        username: string;
        status: 'ACTIVE' | 'DISABLED' | 'LIMITED' | 'EXPIRED';
        trafficUsedBytes: number;
        trafficLimitBytes: number;
        trafficLimitStrategy: 'NO_RESET' | 'DAY' | 'WEEK' | 'MONTH' | 'MONTH_ROLLING';
        lastTrafficResetAt: string | null;
    };
    externalSquads: {
        enabled: boolean;
        allowDefault: boolean;
        current: IExternalSquadOption | null;
        options: IExternalSquadOption[];
    };
    trafficReset: {
        enabled: boolean;
        limit: number;
        used: number;
        remaining: number;
        periodStart: string;
        periodEnd: string;
        /** Why the reset is currently not possible, if so */
        blockedReason: 'LIMIT_REACHED' | 'NO_TRAFFIC_LIMIT' | 'USER_NOT_ACTIVE' | null;
    };
}

export type TAccountErrorCode =
    | 'EXTERNAL_SQUAD_NOT_ALLOWED'
    | 'FEATURE_DISABLED'
    | 'LIMIT_REACHED'
    | 'NO_TRAFFIC_LIMIT'
    | 'REMNAWAVE_ERROR'
    | 'SESSION_EXPIRED'
    | 'USER_NOT_ACTIVE'
    | 'USER_NOT_FOUND'
    | 'VALIDATION_ERROR';
