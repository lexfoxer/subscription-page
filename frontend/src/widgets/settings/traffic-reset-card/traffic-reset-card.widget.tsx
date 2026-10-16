import { Button, Card, Group, Progress, Stack, Text, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconRefresh, IconRotateClockwise2 } from '@tabler/icons-react'
import { useState } from 'react'

import { AccountApiError, IAccountSettings } from '@shared/api/account'
import { useAccountTranslation } from '@shared/locales/account-settings'
import { vibrate } from '@shared/utils/vibrate'

import { useSubscription } from '@entities/subscription-info-store'

import classes from '../settings-card.module.css'

interface IProps {
    onReset: () => Promise<void>
    trafficReset: IAccountSettings['trafficReset']
    user: IAccountSettings['user']
}

export const TrafficResetCardWidget = ({ trafficReset, user, onReset }: IProps) => {
    const { ta, formatDate } = useAccountTranslation()
    const subscription = useSubscription()
    const [isResetting, setIsResetting] = useState(false)

    // Human-readable values come from Remnawave itself, so they match the main page.
    const trafficUsedText = subscription.user.trafficUsed
    const trafficLimitText = subscription.user.trafficLimit

    const hasLimit = user.trafficLimitBytes > 0
    const usagePercent = hasLimit
        ? Math.min(100, Math.round((user.trafficUsedBytes / user.trafficLimitBytes) * 100))
        : 0

    const usageColor = usagePercent >= 100 ? 'red' : usagePercent >= 80 ? 'orange' : 'cyan'

    const blockedText = (() => {
        switch (trafficReset.blockedReason) {
            case 'LIMIT_REACHED':
                return ta('resetBlockedLimit')
            case 'NO_TRAFFIC_LIMIT':
                return ta('resetBlockedUnlimited')
            case 'USER_NOT_ACTIVE':
                return ta('resetBlockedInactive')
            default:
                return null
        }
    })()

    const canReset = trafficReset.blockedReason === null && trafficReset.remaining > 0

    const performReset = async () => {
        setIsResetting(true)

        try {
            await onReset()

            vibrate('success')
            notifications.show({
                title: ta('resetDone'),
                message: ta('resetDoneText'),
                color: 'teal'
            })
        } catch (error) {
            vibrate('error')

            const message =
                error instanceof AccountApiError
                    ? error.code === 'LIMIT_REACHED'
                        ? ta('errorLimitReached')
                        : error.code === 'NO_TRAFFIC_LIMIT'
                          ? ta('resetBlockedUnlimited')
                          : error.code === 'USER_NOT_ACTIVE'
                            ? ta('resetBlockedInactive')
                            : error.code === 'REMNAWAVE_ERROR'
                              ? ta('errorRemnawave')
                              : ta('errorGeneric')
                    : ta('errorGeneric')

            notifications.show({ title: ta('resetTitle'), message, color: 'red' })
        } finally {
            setIsResetting(false)
        }
    }

    const handleResetClick = () => {
        vibrate('tap')

        modals.openConfirmModal({
            centered: true,
            title: ta('resetConfirmTitle'),
            classNames: {
                content: classes.modalContent,
                header: classes.modalHeader,
                title: classes.modalTitle
            },
            children: (
                <Text c="dimmed" size="sm">
                    {ta('resetConfirmText', {
                        remaining: trafficReset.remaining,
                        limit: trafficReset.limit
                    })}
                </Text>
            ),
            labels: { confirm: ta('resetConfirm'), cancel: ta('resetCancel') },
            confirmProps: { color: 'cyan', radius: 'md', variant: 'light' },
            cancelProps: { radius: 'md', variant: 'subtle', color: 'gray' },
            onConfirm: () => void performReset()
        })
    }

    return (
        <Card p={{ base: 'sm', xs: 'md', sm: 'lg', md: 'xl' }} radius="lg">
            <Stack gap="md">
                <Group gap="sm" wrap="nowrap">
                    <IconRotateClockwise2
                        size={22}
                        style={{ color: 'var(--mantine-color-cyan-4)' }}
                    />
                    <Title c="white" fw={600} order={4}>
                        {ta('resetTitle')}
                    </Title>
                </Group>

                <Text c="dimmed" size="sm">
                    {ta('resetDescription')}
                </Text>

                <div className={classes.statBox}>
                    <Stack gap="xs">
                        <Group justify="space-between" wrap="nowrap">
                            <Text c="white" fw={600} size="sm">
                                {hasLimit
                                    ? ta('resetUsage', {
                                          used: trafficUsedText,
                                          limit: trafficLimitText
                                      })
                                    : ta('resetUnlimited', { used: trafficUsedText })}
                            </Text>
                            {hasLimit && (
                                <Text c="dimmed" fw={600} size="sm">
                                    {usagePercent}%
                                </Text>
                            )}
                        </Group>
                        {hasLimit && (
                            <Progress
                                color={usageColor}
                                radius="xl"
                                size="sm"
                                value={usagePercent}
                            />
                        )}
                    </Stack>
                </div>

                <Stack gap={4}>
                    <Text c="white" fw={500} size="sm">
                        {ta('resetRemaining', {
                            remaining: trafficReset.remaining,
                            limit: trafficReset.limit
                        })}
                    </Text>
                    <Text c="dimmed" size="xs">
                        {ta('resetRenews', {
                            date: formatDate(trafficReset.periodEnd, {
                                day: 'numeric',
                                month: 'long',
                                timeZone: 'UTC'
                            })
                        })}
                    </Text>
                    {user.lastTrafficResetAt && (
                        <Text c="dimmed" size="xs">
                            {ta('resetLastAt', {
                                date: formatDate(user.lastTrafficResetAt, {
                                    day: 'numeric',
                                    month: 'long',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                            })}
                        </Text>
                    )}
                </Stack>

                {blockedText && (
                    <Text c="yellow" size="xs">
                        {blockedText}
                    </Text>
                )}

                <Group justify="flex-end">
                    <Button
                        disabled={!canReset}
                        leftSection={<IconRefresh size={18} />}
                        loading={isResetting}
                        onClick={handleResetClick}
                        radius="md"
                        variant="light"
                    >
                        {ta('resetButton')}
                    </Button>
                </Group>
            </Stack>
        </Card>
    )
}
