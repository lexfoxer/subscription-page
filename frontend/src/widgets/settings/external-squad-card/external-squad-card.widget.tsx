import { Badge, Button, Card, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { TSubscriptionPagePlatformKey } from '@remnawave/subscription-page-types'
import { IconDeviceMobile, IconServer2 } from '@tabler/icons-react'
import clsx from 'clsx'
import { useMemo, useState } from 'react'

import { AccountApiError, IAccountSettings, IExternalSquadOption } from '@shared/api/account'
import { useAccountTranslation } from '@shared/locales/account-settings'
import { vibrate } from '@shared/utils/vibrate'

import classes from '../settings-card.module.css'

const DEFAULT_OPTION_VALUE = '__default__'

interface IProps {
    externalSquads: IAccountSettings['externalSquads']
    onSave: (externalSquadUuid: null | string) => Promise<void>
    platform: TSubscriptionPagePlatformKey | undefined
}

interface IOptionRowProps {
    description?: string
    disabled: boolean
    name: string
    onSelect: () => void
    platforms?: TSubscriptionPagePlatformKey[]
    recommended: boolean
    selected: boolean
}

const OptionRow = ({
    name,
    description,
    platforms,
    recommended,
    selected,
    disabled,
    onSelect
}: IOptionRowProps) => {
    const { ta, platformName } = useAccountTranslation()

    const platformsLabel =
        platforms && platforms.length > 0
            ? ta('squadForPlatforms', { platforms: platforms.map(platformName).join(', ') })
            : null

    return (
        <UnstyledButton
            aria-checked={selected}
            className={clsx(
                classes.option,
                selected && classes.optionSelected,
                disabled && classes.optionDisabled
            )}
            disabled={disabled}
            onClick={onSelect}
            role="radio"
        >
            <span className={classes.optionRadio} />
            <div className={classes.optionBody}>
                <Group gap="xs" wrap="wrap">
                    <Text c="white" fw={600} size="sm">
                        {name}
                    </Text>
                    {recommended && (
                        <Badge color="cyan" size="xs" variant="light">
                            {ta('squadRecommended')}
                        </Badge>
                    )}
                </Group>
                {(description || platformsLabel) && (
                    <Text c="dimmed" size="xs">
                        {description ?? platformsLabel}
                    </Text>
                )}
            </div>
        </UnstyledButton>
    )
}

export const ExternalSquadCardWidget = ({ externalSquads, platform, onSave }: IProps) => {
    const { ta, platformName } = useAccountTranslation()

    const currentValue = externalSquads.current?.uuid ?? DEFAULT_OPTION_VALUE

    const [selectedValue, setSelectedValue] = useState<string>(currentValue)
    const [isSaving, setIsSaving] = useState(false)
    const [showAll, setShowAll] = useState(false)

    const isRecommended = (option: IExternalSquadOption) =>
        option.platforms.length === 0 ||
        (platform !== undefined && option.platforms.includes(platform))

    const { recommended, others } = useMemo(() => {
        const recommended: IExternalSquadOption[] = []
        const others: IExternalSquadOption[] = []

        for (const option of externalSquads.options) {
            if (isRecommended(option)) {
                recommended.push(option)
            } else {
                others.push(option)
            }
        }

        return { recommended, others }
    }, [externalSquads.options, platform])

    const currentIsCustom =
        externalSquads.current !== null &&
        !externalSquads.options.some((option) => option.uuid === externalSquads.current?.uuid)

    const mustShowAll = showAll || recommended.length === 0
    const visibleOptions = mustShowAll ? externalSquads.options : recommended
    const hasHiddenOptions = others.length > 0 && recommended.length > 0

    const isDirty = selectedValue !== currentValue

    const handleSave = async () => {
        vibrate('tap')
        setIsSaving(true)

        try {
            await onSave(selectedValue === DEFAULT_OPTION_VALUE ? null : selectedValue)

            notifications.show({
                title: ta('squadSaved'),
                message: ta('squadSavedText'),
                color: 'teal'
            })
        } catch (error) {
            const message =
                error instanceof AccountApiError
                    ? error.code === 'EXTERNAL_SQUAD_NOT_ALLOWED'
                        ? ta('errorNotAllowed')
                        : error.code === 'REMNAWAVE_ERROR'
                          ? ta('errorRemnawave')
                          : ta('errorGeneric')
                    : ta('errorGeneric')

            notifications.show({ title: ta('squadTitle'), message, color: 'red' })
        } finally {
            setIsSaving(false)
        }
    }

    const select = (value: string) => {
        vibrate('selection')
        setSelectedValue(value)
    }

    return (
        <Card p={{ base: 'sm', xs: 'md', sm: 'lg', md: 'xl' }} radius="lg">
            <Stack gap="md">
                <Group gap="sm" justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <IconServer2 size={22} style={{ color: 'var(--mantine-color-cyan-4)' }} />
                        <Title c="white" fw={600} order={4}>
                            {ta('squadTitle')}
                        </Title>
                    </Group>
                    <Badge
                        color="gray"
                        leftSection={<IconDeviceMobile size={12} />}
                        size="sm"
                        variant="light"
                    >
                        {platformName(platform)}
                    </Badge>
                </Group>

                <Text c="dimmed" size="sm">
                    {ta('squadDescription')}
                </Text>

                {currentIsCustom && externalSquads.current && (
                    <Text c="yellow" size="xs">
                        {ta('squadCurrentCustom', { name: externalSquads.current.name })}
                    </Text>
                )}

                {externalSquads.options.length === 0 && !externalSquads.allowDefault ? (
                    <Text c="dimmed" size="sm">
                        {ta('squadNoOptions')}
                    </Text>
                ) : (
                    <Stack gap="xs" role="radiogroup">
                        {externalSquads.allowDefault && (
                            <OptionRow
                                description={ta('squadDefaultDescription')}
                                disabled={isSaving}
                                name={ta('squadDefaultOption')}
                                onSelect={() => select(DEFAULT_OPTION_VALUE)}
                                recommended={false}
                                selected={selectedValue === DEFAULT_OPTION_VALUE}
                            />
                        )}

                        {visibleOptions.map((option) => (
                            <OptionRow
                                disabled={isSaving}
                                key={option.uuid}
                                name={option.name}
                                onSelect={() => select(option.uuid)}
                                platforms={option.platforms}
                                recommended={option.platforms.length > 0 && isRecommended(option)}
                                selected={selectedValue === option.uuid}
                            />
                        ))}

                        {hasHiddenOptions && (
                            <Button
                                color="gray"
                                onClick={() => setShowAll((value) => !value)}
                                size="compact-sm"
                                variant="subtle"
                            >
                                {showAll ? ta('squadShowRecommended') : ta('squadShowAll')}
                            </Button>
                        )}
                    </Stack>
                )}

                <Group justify="flex-end">
                    <Button
                        disabled={!isDirty}
                        loading={isSaving}
                        onClick={handleSave}
                        radius="md"
                        variant="light"
                    >
                        {ta('squadSave')}
                    </Button>
                </Group>
            </Stack>
        </Card>
    )
}
