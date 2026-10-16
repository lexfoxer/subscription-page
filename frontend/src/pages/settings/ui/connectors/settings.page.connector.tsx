import { useOs } from '@mantine/hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { AccountApiError, createAccountApi, IAccountSettings } from '@shared/api/account'
import { osToPlatform } from '@shared/utils/platform'
import { resolveSubscriptionPaths } from '@shared/utils/subscription-path'

import {
    useAccountFeatures,
    useSubscription,
    useSubscriptionInfoStoreActions
} from '@entities/subscription-info-store'

import { SettingsPageComponent } from '../components/settings.page.component'

export const SettingsPageConnector = () => {
    const subscription = useSubscription()
    const features = useAccountFeatures()
    const { updateSubscription } = useSubscriptionInfoStoreActions()
    const navigate = useNavigate()
    const os = useOs({ getValueInEffect: false })

    const paths = useMemo(
        () => resolveSubscriptionPaths(window.location.pathname, subscription.user.shortUuid),
        [subscription.user.shortUuid]
    )

    const api = useMemo(() => createAccountApi(paths.accountApiPath), [paths.accountApiPath])

    const [settings, setSettings] = useState<IAccountSettings | null>(null)
    const [error, setError] = useState<AccountApiError | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Only touches state after the request settles, so it is safe to kick off from an effect.
    const fetchSettings = useCallback(async () => {
        try {
            const data = await api.getSettings()
            setSettings(data)
            setError(null)
        } catch (loadError) {
            setError(
                loadError instanceof AccountApiError
                    ? loadError
                    : new AccountApiError('UNKNOWN', String(loadError), undefined)
            )
        } finally {
            setIsLoading(false)
        }
    }, [api])

    useEffect(() => {
        if (!features.enabled) {
            navigate(paths.subscriptionPath, { replace: true })
            return
        }

        void fetchSettings()
    }, [features.enabled, fetchSettings, navigate, paths.subscriptionPath])

    const handleRetry = () => {
        setIsLoading(true)
        setError(null)
        void fetchSettings()
    }

    const applyMutation = useCallback(
        (result: { settings: IAccountSettings; subscription: unknown }) => {
            setSettings(result.settings)

            if (result.subscription) {
                updateSubscription(result.subscription as Parameters<typeof updateSubscription>[0])
            }
        },
        [updateSubscription]
    )

    const handleSaveExternalSquad = useCallback(
        async (externalSquadUuid: null | string) => {
            applyMutation(await api.setExternalSquad(externalSquadUuid))
        },
        [api, applyMutation]
    )

    const handleResetTraffic = useCallback(async () => {
        applyMutation(await api.resetTraffic())
    }, [api, applyMutation])

    return (
        <SettingsPageComponent
            error={error}
            isLoading={isLoading}
            onBack={() => navigate(paths.subscriptionPath)}
            onResetTraffic={handleResetTraffic}
            onRetry={handleRetry}
            onSaveExternalSquad={handleSaveExternalSquad}
            platform={osToPlatform(os)}
            settings={settings}
        />
    )
}
