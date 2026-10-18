import { GetSubscriptionInfoByShortUuidCommand } from '@remnawave/backend-contract'
import { create } from 'zustand'

import { IAccountFeatures, IActions, IState } from './interfaces'

const DISABLED_FEATURES: IAccountFeatures = {
    enabled: false,
    externalSquads: false,
    trafficReset: false,
    devices: false
}

const initialState: IState = {
    subscription: null,
    accountFeatures: DISABLED_FEATURES
}

export const useSubscriptionInfoStore = create<IActions & IState>()((set) => ({
    ...initialState,
    actions: {
        setSubscriptionInfo: (info) => {
            set((state) => ({
                ...state,
                subscription: info.subscription
            }))
        },
        updateSubscription: (subscription) => {
            set((state) => ({
                ...state,
                subscription
            }))
        },
        setAccountFeatures: (features) => {
            set((state) => ({
                ...state,
                accountFeatures: {
                    externalSquads: Boolean(features.externalSquads),
                    trafficReset: Boolean(features.trafficReset),
                    devices: Boolean(features.devices),
                    enabled:
                        Boolean(features.enabled) &&
                        (Boolean(features.externalSquads) ||
                            Boolean(features.trafficReset) ||
                            Boolean(features.devices))
                }
            }))
        },
        getInitialState: () => {
            return initialState
        },
        resetState: async () => {
            set({ ...initialState })
        }
    }
}))

export const useSubscriptionInfoStoreActions = () =>
    useSubscriptionInfoStore((store) => store.actions)

export const useSubscriptionInfoStoreInfo = () => useSubscriptionInfoStore((state) => state)

export const useAccountFeatures = () => useSubscriptionInfoStore((state) => state.accountFeatures)

export const useSubscription = (): GetSubscriptionInfoByShortUuidCommand.Response['response'] => {
    const subscription = useSubscriptionInfoStore((state) => state.subscription)
    if (!subscription) {
        throw new Error(
            'useSubscription must be used after subscription is loaded (after RootLayout gate)'
        )
    }
    return subscription
}
