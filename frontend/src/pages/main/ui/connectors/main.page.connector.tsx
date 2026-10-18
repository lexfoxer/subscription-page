import { useMediaQuery, useOs } from '@mantine/hooks'
import { useEffect, useState } from 'react'

import { useSubscriptionInfoStoreInfo } from '@entities/subscription-info-store'
import { useAppConfig, useIsConfigLoaded } from '@entities/app-config-store'
import { osToPlatform } from '@shared/utils/platform'
import { LoadingScreen } from '@shared/ui'

import { MainPageComponent } from '../components/main.page.component'

export const MainPageConnector = () => {
    const { subscription } = useSubscriptionInfoStoreInfo()
    const config = useAppConfig()
    const os = useOs({ getValueInEffect: false })

    const isConfigLoaded = useIsConfigLoaded()

    const isMobile = useMediaQuery(`(max-width: 30rem)`, undefined, {
        getInitialValueInEffect: false
    })

    const [isMediaQueryReady, setIsMediaQueryReady] = useState(false)

    useEffect(() => {
        setIsMediaQueryReady(true)
    }, [isMobile])

    if (!isConfigLoaded || !subscription || !config || !isMediaQueryReady)
        return <LoadingScreen height="100vh" />

    return <MainPageComponent isMobile={isMobile} platform={osToPlatform(os)} />
}
