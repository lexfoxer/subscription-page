import { TSelectablePlatformKey } from './schemas/account.schemas';

/**
 * Naming convention for `EXTERNAL_SQUADS_SELECTABLE=auto`.
 *
 * Remnawave only allows letters, digits, underscores, dashes and spaces in squad names,
 * so the marker is a first word that starts with `pub`, optionally followed by platform
 * tags joined with dashes/underscores. Tags are platform keys (or aliases) or `all`:
 *
 *   "pub-ios-macos Apple servers"  -> selectable, recommended on iOS / macOS
 *   "pub-all Every server"         -> selectable, suits any device
 *   "pub Every server"             -> same as pub-all
 *   "Internal squad"               -> not selectable (no marker)
 *
 * The legacy "[ios,macos] Apple servers" form is accepted too. The marker is stripped from
 * the name shown to users.
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

const BRACKET_NAME_REGEX = /^\s*\[([^\]]*)\]\s*(.*)$/s;
const PUB_NAME_REGEX = /^\s*pub(?:[-_]([a-z0-9*_-]*))?(?:\s+(.*))?$/is;

export interface IParsedExternalSquadName {
    displayName: string;
    /** Empty array means "any platform". */
    platforms: TSelectablePlatformKey[];
    selectable: boolean;
    unknownTags: string[];
}

function extractTags(name: string): { rawTags: string; rest: string } | null {
    const bracket = BRACKET_NAME_REGEX.exec(name);

    if (bracket) {
        return { rawTags: bracket[1], rest: bracket[2] };
    }

    const pub = PUB_NAME_REGEX.exec(name);

    if (pub) {
        return { rawTags: pub[1] ?? '', rest: pub[2] ?? '' };
    }

    return null;
}

export function parseExternalSquadName(name: string): IParsedExternalSquadName {
    const extracted = extractTags(name);

    if (!extracted) {
        return { selectable: false, displayName: name.trim(), platforms: [], unknownTags: [] };
    }

    const tags = extracted.rawTags
        .split(/[,;|_\s-]+/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

    const displayName = extracted.rest.trim() || name.trim();

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
