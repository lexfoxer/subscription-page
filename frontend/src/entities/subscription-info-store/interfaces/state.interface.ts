import { GetSubscriptionInfoByShortUuidCommand } from '@remnawave/backend-contract'

export interface IAccountFeatures {
    enabled: boolean
    externalSquads: boolean
    trafficReset: boolean
}

export interface IState {
    accountFeatures: IAccountFeatures
    subscription: GetSubscriptionInfoByShortUuidCommand.Response['response'] | null
}
