import proxyaddr from 'proxy-addr';
import { z } from 'zod';

const booleanString = (def: 'true' | 'false' = 'false') =>
    z
        .string()
        .default(def)
        .transform((val) => (val === '' ? def : val))
        .refine((val) => val === 'true' || val === 'false', 'Must be "true" or "false".')
        .transform((val) => val === 'true')
        .pipe(z.boolean());

const TRUST_PROXY_DEFAULT = '1';

const isTrustProxy = (val: string): boolean => {
    if (val === 'true' || val === 'false' || /^\d+$/.test(val)) return true;

    try {
        proxyaddr.compile(val.split(',').map((entry) => entry.trim()));
        return true;
    } catch {
        return false;
    }
};

const SELECTABLE_PLATFORMS = [
    'ios',
    'android',
    'linux',
    'macos',
    'windows',
    'androidTV',
    'appleTV',
] as const;

export const selectableExternalSquadSchema = z.object({
    uuid: z.uuid(),
    label: z.string().min(1).max(64).optional(),
    platforms: z.array(z.enum(SELECTABLE_PLATFORMS)).default([]),
});

export type TSelectableExternalSquad = z.infer<typeof selectableExternalSquadSchema>;

/**
 * - disabled: feature off
 * - auto:     every Remnawave external squad whose name starts with "[tags]" is selectable
 * - list:     only the squads enumerated in the env JSON array
 */
export type TExternalSquadsConfig =
    | { mode: 'auto' }
    | { mode: 'disabled' }
    | { mode: 'list'; squads: TSelectableExternalSquad[] };

const selectableExternalSquadsList = () =>
    z
        .string()
        .optional()
        .transform((val, ctx): TExternalSquadsConfig => {
            const raw = val?.trim();

            if (!raw) return { mode: 'disabled' };

            if (raw.toLowerCase() === 'auto') return { mode: 'auto' };

            let parsed: unknown;

            try {
                parsed = JSON.parse(raw);
            } catch {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        'Must be "auto" or a JSON array, e.g. [{"uuid":"<external squad uuid>","platforms":["ios","macos"],"label":"Fast servers"}]',
                });
                return z.NEVER;
            }

            const result = z.array(selectableExternalSquadSchema).min(1).safeParse(parsed);

            if (!result.success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: result.error.issues
                        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
                        .join('; '),
                });
                return z.NEVER;
            }

            const seen = new Set<string>();
            for (const squad of result.data) {
                if (seen.has(squad.uuid)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Duplicate external squad uuid: ${squad.uuid}`,
                    });
                    return z.NEVER;
                }
                seen.add(squad.uuid);
            }

            return { mode: 'list', squads: result.data };
        });

const nonNegativeIntString = (def: string) =>
    z
        .string()
        .default(def)
        .transform((val) => (val.trim() === '' ? def : val.trim()))
        .refine((val) => /^\d+$/.test(val), 'Must be a non-negative integer.')
        .transform((val) => Number(val));

const REQUIRED_REMNAWAVE_API_TOKEN_MESSAGE =
    'Remnawave Dashboard → Remnawave Settings → API Tokens. Create a new API Token and set it in the .env file.';

export const configSchema = z
    .object({
        APP_PORT: z
            .string()
            .default('3010')
            .transform((port) => parseInt(port, 10)),
        REMNAWAVE_PANEL_URL: z.string(),
        REMNAWAVE_API_TOKEN: z
            .string({ message: REQUIRED_REMNAWAVE_API_TOKEN_MESSAGE })
            .min(1, REQUIRED_REMNAWAVE_API_TOKEN_MESSAGE),

        SUBPAGE_CONFIG_UUID: z.string().default('00000000-0000-0000-0000-000000000000'),
        CUSTOM_SUB_PREFIX: z.optional(z.string()),

        TRUST_PROXY: z
            .string()
            .default(TRUST_PROXY_DEFAULT)
            .transform((val) => (val.trim() === '' ? TRUST_PROXY_DEFAULT : val.trim()))
            .refine(
                isTrustProxy,
                'TRUST_PROXY must be "true"/"false", a non-negative integer (number of trusted ' +
                    'reverse-proxy hops), or a comma-separated list of preset names ' +
                    '(loopback, linklocal, uniquelocal) and/or IP addresses / CIDR subnets.',
            )
            .transform((val): boolean | number | string => {
                if (val === 'true') return true;
                if (val === 'false') return false;
                if (/^\d+$/.test(val)) return Number(val);
                return val;
            }),

        CADDY_AUTH_API_TOKEN: z.optional(z.string()),
        CLOUDFLARE_ZERO_TRUST_CLIENT_ID: z.optional(z.string()),
        CLOUDFLARE_ZERO_TRUST_CLIENT_SECRET: z.optional(z.string()),

        MARZBAN_LEGACY_LINK_ENABLED: booleanString(),
        MARZBAN_LEGACY_SECRET_KEY: z.optional(z.string()),
        MARZBAN_LEGACY_SUBSCRIPTION_VALID_FROM: z.optional(z.string()),
        MARZBAN_LEGACY_DROP_REVOKED_SUBSCRIPTIONS: booleanString(),
        INTERNAL_JWT_SECRET: z.string(),
        EGAMES_COOKIE: z.optional(z.string()),

        DATA_DIR: z
            .string()
            .default('data')
            .transform((val) => (val.trim() === '' ? 'data' : val.trim())),
        TRAFFIC_RESET_LIMIT_PER_MONTH: nonNegativeIntString('0'),
        EXTERNAL_SQUADS_SELECTABLE: selectableExternalSquadsList(),
        EXTERNAL_SQUADS_ALLOW_DEFAULT: booleanString(),
        /** true = drop connections like upstream Remnawave; false = answer with HTTP statuses */
        STEALTH_MODE: booleanString(),
    })
    .superRefine((data, ctx) => {
        if (
            !data.REMNAWAVE_PANEL_URL.startsWith('http://') &&
            !data.REMNAWAVE_PANEL_URL.startsWith('https://')
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'REMNAWAVE_PANEL_URL must start with http:// or https://',
                path: ['REMNAWAVE_PANEL_URL'],
            });
        }
        if (data.MARZBAN_LEGACY_LINK_ENABLED) {
            if (!data.MARZBAN_LEGACY_SECRET_KEY) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        'MARZBAN_LEGACY_SECRET_KEY is required when MARZBAN_LEGACY_LINK_ENABLED is true',
                });
            }
        }
    });

export type ConfigSchema = z.infer<typeof configSchema>;
