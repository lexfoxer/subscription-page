import { GetSubscriptionInfoByShortUuidCommand } from '@remnawave/backend-contract'
import { TSubscriptionPagePlatformKey } from '@remnawave/subscription-page-types'

export type TUserStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'LIMITED'

export type TResetBlockedReason = 'LIMIT_REACHED' | 'NO_TRAFFIC_LIMIT' | 'USER_NOT_ACTIVE'

export interface IExternalSquadOption {
    name: string
    platforms: TSubscriptionPagePlatformKey[]
    uuid: string
}

export interface IAccountSettings {
    externalSquads: {
        allowDefault: boolean
        current: IExternalSquadOption | null
        enabled: boolean
        options: IExternalSquadOption[]
    }
    trafficReset: {
        blockedReason: null | TResetBlockedReason
        enabled: boolean
        limit: number
        periodEnd: string
        periodStart: string
        remaining: number
        used: number
    }
    user: {
        lastTrafficResetAt: null | string
        status: TUserStatus
        trafficLimitBytes: number
        trafficLimitStrategy: 'DAY' | 'MONTH' | 'MONTH_ROLLING' | 'NO_RESET' | 'WEEK'
        trafficUsedBytes: number
        username: string
    }
}

export type IAccountTrafficReset = Pick<IAccountSettings, 'trafficReset' | 'user'>

export interface IAccountMutationResult {
    settings: IAccountSettings
    subscription: GetSubscriptionInfoByShortUuidCommand.Response['response'] | null
}

export type TAccountErrorCode =
    | 'EXTERNAL_SQUAD_NOT_ALLOWED'
    | 'FEATURE_DISABLED'
    | 'LIMIT_REACHED'
    | 'NETWORK_ERROR'
    | 'NO_TRAFFIC_LIMIT'
    | 'REMNAWAVE_ERROR'
    | 'SESSION_EXPIRED'
    | 'UNKNOWN'
    | 'USER_NOT_ACTIVE'
    | 'USER_NOT_FOUND'
    | 'VALIDATION_ERROR'
