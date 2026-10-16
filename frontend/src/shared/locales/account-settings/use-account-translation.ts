import { TSubscriptionPagePlatformKey } from '@remnawave/subscription-page-types'
import { useCallback } from 'react'

import { useCurrentLang } from '@entities/app-config-store'

import {
    ACCOUNT_DEFAULT_TRANSLATIONS,
    ACCOUNT_TRANSLATIONS,
    TAccountTranslationKey
} from './account-settings.locale'

type TVars = Record<string, number | string>

const PLATFORM_KEY: Record<TSubscriptionPagePlatformKey, TAccountTranslationKey> = {
    ios: 'platformIos',
    android: 'platformAndroid',
    macos: 'platformMacos',
    windows: 'platformWindows',
    linux: 'platformLinux',
    androidTV: 'platformAndroidTV',
    appleTV: 'platformAppleTV'
}

function interpolate(template: string, vars?: TVars): string {
    if (!vars) return template

    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
        vars[key] === undefined ? match : String(vars[key])
    )
}

export const useAccountTranslation = () => {
    const currentLang = useCurrentLang()
    const dictionary = ACCOUNT_TRANSLATIONS[currentLang] ?? ACCOUNT_DEFAULT_TRANSLATIONS

    const ta = useCallback(
        (key: TAccountTranslationKey, vars?: TVars) =>
            interpolate(dictionary[key] ?? ACCOUNT_DEFAULT_TRANSLATIONS[key], vars),
        [dictionary]
    )

    const platformName = useCallback(
        (platform: TSubscriptionPagePlatformKey | undefined) =>
            platform ? ta(PLATFORM_KEY[platform]) : ta('platformUnknown'),
        [ta]
    )

    const formatDate = useCallback(
        (iso: string, options: Intl.DateTimeFormatOptions) => {
            try {
                return new Intl.DateTimeFormat(currentLang, options).format(new Date(iso))
            } catch {
                return new Intl.DateTimeFormat('en', options).format(new Date(iso))
            }
        },
        [currentLang]
    )

    return { ta, platformName, formatDate, currentLang }
}
