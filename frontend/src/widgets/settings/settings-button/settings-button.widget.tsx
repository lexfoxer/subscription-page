import { ActionIcon, Tooltip } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import { useNavigate } from 'react-router'

import { useAccountTranslation } from '@shared/locales/account-settings'
import { resolveSubscriptionPaths } from '@shared/utils/subscription-path'
import { vibrate } from '@shared/utils/vibrate'

import { useAccountFeatures, useSubscription } from '@entities/subscription-info-store'

export const SettingsButton = () => {
    const features = useAccountFeatures()
    const subscription = useSubscription()
    const navigate = useNavigate()
    const { ta } = useAccountTranslation()

    if (!features.enabled) return null

    const handleClick = () => {
        vibrate('tap')

        const paths = resolveSubscriptionPaths(
            window.location.pathname,
            subscription.user.shortUuid
        )

        navigate(paths.settingsPath)
    }

    return (
        <Tooltip label={ta('settingsTooltip')} openDelay={400} withArrow={false}>
            <ActionIcon
                aria-label={ta('settingsTooltip')}
                onClick={handleClick}
                radius="md"
                size="xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                variant="default"
            >
                <IconSettings />
            </ActionIcon>
        </Tooltip>
    )
}
