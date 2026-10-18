import { ActionIcon, Badge, Box, Card, Group, Stack, Text, Title, Tooltip } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
    IconBrandAndroid,
    IconBrandApple,
    IconBrandWindows,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconDevices,
    IconDeviceTv,
    IconTrash
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import {
    AccountApiError,
    createAccountApi,
    IAccountDevice,
    IAccountDevices
} from '@shared/api/account'
import { useAccountTranslation } from '@shared/locales/account-settings'
import { resolveSubscriptionPaths } from '@shared/utils/subscription-path'
import { vibrate } from '@shared/utils/vibrate'

import { useAccountFeatures, useSubscription } from '@entities/subscription-info-store'

import classes from '../settings-card.module.css'

function platformIcon(platform: null | string) {
    const key = (platform ?? '').toLowerCase()

    if (key.includes('ios') || key.includes('iphone') || key.includes('ipad'))
        return <IconDeviceMobile size={18} />
    if (key.includes('mac')) return <IconBrandApple size={18} />
    if (key.includes('tv')) return <IconDeviceTv size={18} />
    if (key.includes('android')) return <IconBrandAndroid size={18} />
    if (key.includes('win')) return <IconBrandWindows size={18} />
    if (key.includes('linux')) return <IconDeviceDesktop size={18} />

    return <IconDevices size={18} />
}

function deviceName(device: IAccountDevice, fallback: string): string {
    if (device.deviceModel) return device.deviceModel

    const parts = [device.platform, device.osVersion].filter(Boolean)

    return parts.length > 0 ? parts.join(' ') : fallback
}

export const DevicesCardConnector = () => {
    const { ta, formatDate } = useAccountTranslation()
    const features = useAccountFeatures()
    const subscription = useSubscription()

    const api = useMemo(() => {
        const paths = resolveSubscriptionPaths(
            window.location.pathname,
            subscription.user.shortUuid
        )
        return createAccountApi(paths.accountApiPath)
    }, [subscription.user.shortUuid])

    const [data, setData] = useState<IAccountDevices | null>(null)
    const [loadFailed, setLoadFailed] = useState(false)
    const [busyHwid, setBusyHwid] = useState<null | string>(null)

    useEffect(() => {
        if (!features.devices) return

        let cancelled = false

        api.getDevices()
            .then((result) => {
                if (!cancelled) setData(result)
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true)
            })

        return () => {
            cancelled = true
        }
    }, [api, features.devices])

    if (!features.devices) return null

    const unlink = async (device: IAccountDevice) => {
        setBusyHwid(device.hwid)

        try {
            setData(await api.deleteDevice(device.hwid))
            vibrate('success')
            notifications.show({
                title: ta('devicesUnlinked'),
                message: deviceName(device, ta('devicesUnknownDevice')),
                color: 'teal'
            })
        } catch (error) {
            vibrate('error')
            notifications.show({
                title: ta('devicesTitle'),
                message:
                    error instanceof AccountApiError && error.code === 'REMNAWAVE_ERROR'
                        ? ta('errorRemnawave')
                        : ta('errorGeneric'),
                color: 'red'
            })
        } finally {
            setBusyHwid(null)
        }
    }

    const confirmUnlink = (device: IAccountDevice) => {
        vibrate('tap')

        modals.openConfirmModal({
            centered: true,
            title: ta('devicesUnlinkConfirmTitle'),
            classNames: {
                content: classes.modalContent,
                header: classes.modalHeader,
                title: classes.modalTitle
            },
            children: (
                <Text c="dimmed" size="sm">
                    {ta('devicesUnlinkConfirmText', {
                        name: deviceName(device, ta('devicesUnknownDevice'))
                    })}
                </Text>
            ),
            labels: { confirm: ta('devicesUnlinkConfirm'), cancel: ta('resetCancel') },
            confirmProps: { color: 'red', radius: 'md', variant: 'light' },
            cancelProps: { radius: 'md', variant: 'subtle', color: 'gray' },
            onConfirm: () => void unlink(device)
        })
    }

    const countLabel = data
        ? data.limit && data.limit > 0
            ? ta('devicesCount', { count: data.devices.length, limit: data.limit })
            : ta('devicesCountNoLimit', { count: data.devices.length })
        : null

    const dateOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }

    return (
        <Card p={{ base: 'sm', xs: 'md', sm: 'lg', md: 'xl' }} radius="lg">
            <Stack gap="md">
                <Group gap="sm" justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <IconDevices size={22} style={{ color: 'var(--mantine-color-cyan-4)' }} />
                        <Title c="white" fw={600} order={4}>
                            {ta('devicesTitle')}
                        </Title>
                    </Group>
                    {countLabel && (
                        <Badge
                            color={
                                data?.limit && data.devices.length >= data.limit ? 'orange' : 'cyan'
                            }
                            size="sm"
                            variant="light"
                        >
                            {countLabel}
                        </Badge>
                    )}
                </Group>

                <Text c="dimmed" size="sm">
                    {ta('devicesDescription')}
                </Text>

                {loadFailed && (
                    <Text c="yellow" size="xs">
                        {ta('devicesLoadError')}
                    </Text>
                )}

                {data && data.devices.length === 0 && (
                    <Text c="dimmed" size="sm">
                        {ta('devicesEmpty')}
                    </Text>
                )}

                {data && data.devices.length > 0 && (
                    <Stack gap="xs">
                        {data.devices.map((device) => (
                            <Box className={classes.statBox} key={device.hwid}>
                                <Group gap="sm" justify="space-between" wrap="nowrap">
                                    <Group gap="sm" style={{ minWidth: 0 }} wrap="nowrap">
                                        <Box
                                            style={{
                                                color: 'var(--mantine-color-cyan-4)',
                                                flexShrink: 0,
                                                display: 'flex'
                                            }}
                                        >
                                            {platformIcon(device.platform)}
                                        </Box>
                                        <Stack gap={2} style={{ minWidth: 0 }}>
                                            <Text c="white" fw={600} size="sm" truncate>
                                                {deviceName(device, ta('devicesUnknownDevice'))}
                                            </Text>
                                            <Text c="dimmed" size="xs" truncate>
                                                {[device.platform, device.osVersion]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                                {device.userAgent ? ` · ${device.userAgent}` : ''}
                                            </Text>
                                            <Text c="dimmed" size="xs">
                                                {ta('devicesLastSeen', {
                                                    date: formatDate(device.updatedAt, dateOptions)
                                                })}
                                                {' · '}
                                                {ta('devicesAdded', {
                                                    date: formatDate(device.createdAt, dateOptions)
                                                })}
                                            </Text>
                                        </Stack>
                                    </Group>

                                    <Tooltip label={ta('devicesUnlink')} openDelay={400}>
                                        <ActionIcon
                                            aria-label={ta('devicesUnlink')}
                                            color="red"
                                            loading={busyHwid === device.hwid}
                                            onClick={() => confirmUnlink(device)}
                                            radius="md"
                                            size="lg"
                                            variant="subtle"
                                        >
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Stack>
        </Card>
    )
}
