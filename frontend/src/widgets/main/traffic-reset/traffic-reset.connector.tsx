import { TrafficResetCardWidget } from '@widgets/settings'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { createAccountApi, IAccountTrafficReset } from '@shared/api/account'
import { resolveSubscriptionPaths } from '@shared/utils/subscription-path'

import {
    useAccountFeatures,
    useSubscription,
    useSubscriptionInfoStoreActions
} from '@entities/subscription-info-store'

/**
 * Traffic usage + self-service reset block on the main page. Rendered only when the
 * feature is enabled and the data loaded; failures (e.g. expired session) hide it silently,
 * the settings page still reports them.
 */
export const TrafficResetConnector = () => {
    const features = useAccountFeatures()
    const subscription = useSubscription()
    const { updateSubscription } = useSubscriptionInfoStoreActions()

    const api = useMemo(() => {
        const paths = resolveSubscriptionPaths(
            window.location.pathname,
            subscription.user.shortUuid
        )
        return createAccountApi(paths.accountApiPath)
    }, [subscription.user.shortUuid])

    const [data, setData] = useState<IAccountTrafficReset | null>(null)

    useEffect(() => {
        if (!features.trafficReset) return

        let cancelled = false

        api.getTrafficReset()
            .then((result) => {
                if (!cancelled) setData(result)
            })
            .catch(() => {
                if (!cancelled) setData(null)
            })

        return () => {
            cancelled = true
        }
    }, [api, features.trafficReset])

    const handleReset = useCallback(async () => {
        const result = await api.resetTraffic()

        setData({ user: result.settings.user, trafficReset: result.settings.trafficReset })

        if (result.subscription) {
            updateSubscription(result.subscription)
        }
    }, [api, updateSubscription])

    if (!features.trafficReset || !data) return null

    return (
        <TrafficResetCardWidget
            onReset={handleReset}
            trafficReset={data.trafficReset}
            user={data.user}
        />
    )
}
