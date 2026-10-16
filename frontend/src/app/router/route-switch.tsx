import { MainPageConnector } from '@pages/main/ui/connectors/main.page.connector'
import { SettingsPageConnector } from '@pages/settings/ui/connectors/settings.page.connector'
import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { LoadingScreen } from '@shared/ui'
import { resolveSubscriptionPaths } from '@shared/utils/subscription-path'

import { useIsConfigLoaded } from '@entities/app-config-store'
import { useSubscriptionInfoStoreInfo } from '@entities/subscription-info-store'

/**
 * The app is mounted at `/[prefix]/<shortUuid>`, where the prefix is only known at
 * runtime, so pages are picked by inspecting the path relative to the shortUuid.
 */
export const RouteSwitch = () => {
    const location = useLocation()
    const { subscription } = useSubscriptionInfoStoreInfo()
    const isConfigLoaded = useIsConfigLoaded()

    useEffect(() => {
        window.scrollTo({ top: 0 })
    }, [location.pathname])

    if (!isConfigLoaded || !subscription) return <LoadingScreen height="100vh" />

    const paths = resolveSubscriptionPaths(location.pathname, subscription.user.shortUuid)

    if (paths.isSettings) {
        return <SettingsPageConnector />
    }

    return <MainPageConnector />
}
