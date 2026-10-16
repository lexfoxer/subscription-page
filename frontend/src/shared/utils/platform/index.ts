import { TSubscriptionPagePlatformKey } from '@remnawave/subscription-page-types'

export function osToPlatform(os: string): TSubscriptionPagePlatformKey | undefined {
    switch (os) {
        case 'android':
            return 'android'
        case 'ios':
            return 'ios'
        case 'linux':
            return 'linux'
        case 'macos':
            return 'macos'
        case 'windows':
            return 'windows'
        default:
            return undefined
    }
}
