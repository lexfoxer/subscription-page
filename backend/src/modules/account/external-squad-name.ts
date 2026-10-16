import { TSelectablePlatformKey } from './schemas/account.schemas';

/**
 * Naming convention for `EXTERNAL_SQUADS_SELECTABLE=auto`.
 *
 * A squad is offered to users only when its name in Remnawave starts with a tag list in
 * square brackets. Tags are platform keys (or their aliases) or `all`:
 *
 *   "[ios,macos] Apple servers"  -> selectable, recommended on iOS / macOS
 *   "[all] Every server"         -> selectable, suits any device
 *   "[hidden] Experiments"       -> not selectable
 *   "Internal squad"             -> not selectable (no tags)
 *
 * The brackets are stripped from the name shown to users.
 */

const PLATFORM_ALIASES: Record<string, TSelectablePlatformKey> = {
    ios: 'ios',
    iphone: 'ios',
    ipad: 'ios',
    android: 'android',
    macos: 'macos',
    mac: 'macos',
    osx: 'macos',
    windows: 'windows',
    win: 'windows',
    linux: 'linux',
    androidtv: 'androidTV',
    atv: 'androidTV',
    appletv: 'appleTV',
    tvos: 'appleTV',
};

const ANY_PLATFORM_TAGS = new Set(['all', 'any', '*']);
const HIDDEN_TAGS = new Set(['hidden', 'private', 'internal']);

const TAGGED_NAME_REGEX = /^\s*\[([^\]]*)\]\s*(.*)$/s;

export interface IParsedExternalSquadName {
    displayName: string;
    /** Empty array means "any platform". */
    platforms: TSelectablePlatformKey[];
    selectable: boolean;
    unknownTags: string[];
}

export function parseExternalSquadName(name: string): IParsedExternalSquadName {
    const match = TAGGED_NAME_REGEX.exec(name);

    if (!match) {
        return { selectable: false, displayName: name.trim(), platforms: [], unknownTags: [] };
    }

    const tags = match[1]
        .split(/[,;|\s]+/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

    const displayName = match[2].trim() || name.trim();

    if (tags.some((tag) => HIDDEN_TAGS.has(tag))) {
        return { selectable: false, displayName, platforms: [], unknownTags: [] };
    }

    const platforms = new Set<TSelectablePlatformKey>();
    const unknownTags: string[] = [];
    let anyPlatform = tags.length === 0;

    for (const tag of tags) {
        if (ANY_PLATFORM_TAGS.has(tag)) {
            anyPlatform = true;
            continue;
        }

        const platform = PLATFORM_ALIASES[tag];

        if (platform) {
            platforms.add(platform);
        } else {
            unknownTags.push(tag);
        }
    }

    return {
        selectable: true,
        displayName,
        platforms: anyPlatform ? [] : [...platforms],
        unknownTags,
    };
}
