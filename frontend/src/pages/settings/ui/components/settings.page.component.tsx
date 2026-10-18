import {
    ActionIcon,
    Alert,
    Box,
    Button,
    Center,
    Container,
    Group,
    Stack,
    Title
} from '@mantine/core'
import { TSubscriptionPagePlatformKey } from '@remnawave/subscription-page-types'
import { IconAlertTriangle, IconArrowLeft } from '@tabler/icons-react'
import {
    DevicesCardConnector,
    ExternalSquadCardWidget,
    TrafficResetCardWidget
} from '@widgets/settings'

import { AccountApiError, IAccountSettings } from '@shared/api/account'
import { useAccountTranslation } from '@shared/locales/account-settings'
import { LoadingScreen, Page } from '@shared/ui'
import { LanguagePicker } from '@shared/ui/language-picker/language-picker.shared'
import { vibrate } from '@shared/utils/vibrate'

import { useAppConfig, useAppConfigStoreActions, useCurrentLang } from '@entities/app-config-store'

interface IProps {
    error: AccountApiError | null
    isLoading: boolean
    onBack: () => void
    onResetTraffic: () => Promise<void>
    onRetry: () => void
    onSaveExternalSquad: (externalSquadUuid: null | string) => Promise<void>
    platform: TSubscriptionPagePlatformKey | undefined
    settings: IAccountSettings | null
}

export const SettingsPageComponent = ({
    error,
    isLoading,
    onBack,
    onResetTraffic,
    onRetry,
    onSaveExternalSquad,
    platform,
    settings
}: IProps) => {
    const { ta } = useAccountTranslation()
    const config = useAppConfig()
    const currentLang = useCurrentLang()
    const { setLanguage } = useAppConfigStoreActions()

    const renderBody = () => {
        if (isLoading && !settings) {
            return <LoadingScreen height="40vh" />
        }

        if (error && !settings) {
            const isSessionExpired = error.code === 'SESSION_EXPIRED'

            return (
                <Alert
                    color={isSessionExpired ? 'yellow' : 'red'}
                    icon={<IconAlertTriangle size={18} />}
                    radius="lg"
                    title={isSessionExpired ? ta('sessionExpiredTitle') : ta('loadingError')}
                    variant="light"
                >
                    <Stack gap="sm">
                        <span>
                            {isSessionExpired ? ta('sessionExpiredText') : ta('errorGeneric')}
                        </span>
                        <Group>
                            {isSessionExpired ? (
                                <Button
                                    onClick={() => window.location.reload()}
                                    radius="md"
                                    size="xs"
                                    variant="light"
                                >
                                    {ta('reloadPage')}
                                </Button>
                            ) : (
                                <Button onClick={onRetry} radius="md" size="xs" variant="light">
                                    {ta('retry')}
                                </Button>
                            )}
                        </Group>
                    </Stack>
                </Alert>
            )
        }

        if (!settings) return null

        return (
            <>
                {settings.externalSquads.enabled && (
                    <ExternalSquadCardWidget
                        externalSquads={settings.externalSquads}
                        key={settings.externalSquads.current?.uuid ?? 'default'}
                        onSave={onSaveExternalSquad}
                        platform={platform}
                    />
                )}

                {settings.trafficReset.enabled && (
                    <TrafficResetCardWidget
                        onReset={onResetTraffic}
                        trafficReset={settings.trafficReset}
                        user={settings.user}
                    />
                )}

                <DevicesCardConnector />
            </>
        )
    }

    return (
        <Page>
            <Box className="header-wrapper" py="md">
                <Container maw={1200} px={{ base: 'md', sm: 'lg', md: 'xl' }}>
                    <Group gap="sm" wrap="nowrap">
                        <ActionIcon
                            aria-label={ta('backToSubscription')}
                            onClick={() => {
                                vibrate('tap')
                                onBack()
                            }}
                            radius="md"
                            size="xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                            variant="default"
                        >
                            <IconArrowLeft />
                        </ActionIcon>
                        <Title c="white" fw={700} order={4} size="lg">
                            {ta('settingsTitle')}
                        </Title>
                    </Group>
                </Container>
            </Box>

            <Container
                maw={1200}
                px={{ base: 'md', sm: 'lg', md: 'xl' }}
                py="xl"
                style={{ position: 'relative', zIndex: 1 }}
            >
                <Stack gap="xl">
                    {renderBody()}

                    <Center>
                        <LanguagePicker
                            currentLang={currentLang}
                            locales={config.locales}
                            onLanguageChange={setLanguage}
                        />
                    </Center>
                </Stack>
            </Container>
        </Page>
    )
}
