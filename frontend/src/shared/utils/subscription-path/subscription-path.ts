import { joinURL } from 'ufo'

/** Must match ACCOUNT_SETTINGS_PATH_SEGMENT on the backend. */
export const SETTINGS_PATH_SEGMENT = 'settings'

export interface ISubscriptionPaths {
    /** Path prefix before the shortUuid (CUSTOM_SUB_PREFIX), '' or '/sub' */
    basePath: string
    /** `/[prefix]/<shortUuid>` */
    subscriptionPath: string
    /** `/[prefix]/<shortUuid>/settings` */
    settingsPath: string
    /** `/[prefix]/api/account` */
    accountApiPath: string
    isSettings: boolean
}

/**
 * The page is served from `/[prefix]/<shortUuid>[/settings]`. Everything before the
 * shortUuid is the custom prefix the backend is mounted on, so API calls and
 * in-app navigation are built relative to it.
 */
export function resolveSubscriptionPaths(pathname: string, shortUuid: string): ISubscriptionPaths {
    const segments = pathname.split('/').filter(Boolean)

    let uuidIndex = segments.lastIndexOf(shortUuid)

    if (uuidIndex === -1) {
        // Marzban legacy links resolve to a different shortUuid: fall back to position.
        const last = segments.at(-1)
        uuidIndex = last === SETTINGS_PATH_SEGMENT ? segments.length - 2 : segments.length - 1
    }

    const prefixSegments = segments.slice(0, Math.max(0, uuidIndex))
    const basePath = prefixSegments.length > 0 ? joinURL('/', ...prefixSegments) : ''
    const subscriptionPath = joinURL(basePath || '/', shortUuid)

    return {
        basePath,
        subscriptionPath,
        settingsPath: joinURL(subscriptionPath, SETTINGS_PATH_SEGMENT),
        accountApiPath: joinURL(basePath || '/', 'api/account'),
        isSettings: segments[uuidIndex + 1] === SETTINGS_PATH_SEGMENT
    }
}
