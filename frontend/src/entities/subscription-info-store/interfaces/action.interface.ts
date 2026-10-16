import { GetSubscriptionInfoByShortUuidCommand } from '@remnawave/backend-contract'

import { IAccountFeatures, IState } from './state.interface'

export interface IActions {
    actions: {
        getInitialState: () => IState
        resetState: () => Promise<void>
        setAccountFeatures: (features: IAccountFeatures) => void
        setSubscriptionInfo: (info: Pick<IState, 'subscription'>) => void
        updateSubscription: (
            subscription: GetSubscriptionInfoByShortUuidCommand.Response['response']
        ) => void
    }
}
