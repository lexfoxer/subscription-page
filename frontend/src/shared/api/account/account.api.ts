import { FetchError, ofetch } from 'ofetch'
import { joinURL } from 'ufo'

import {
    IAccountDevices,
    IAccountMutationResult,
    IAccountSettings,
    IAccountTrafficReset,
    TAccountErrorCode
} from './account.types'

export class AccountApiError extends Error {
    constructor(
        public readonly code: TAccountErrorCode,
        message: string,
        public readonly status: number | undefined
    ) {
        super(message)
        this.name = 'AccountApiError'
    }
}

const KNOWN_CODES = new Set<TAccountErrorCode>([
    'DEVICE_NOT_FOUND',
    'EXTERNAL_SQUAD_NOT_ALLOWED',
    'FEATURE_DISABLED',
    'LIMIT_REACHED',
    'NO_TRAFFIC_LIMIT',
    'REMNAWAVE_ERROR',
    'SESSION_EXPIRED',
    'USER_NOT_ACTIVE',
    'USER_NOT_FOUND',
    'VALIDATION_ERROR'
])

function toAccountApiError(error: unknown): AccountApiError {
    if (error instanceof FetchError) {
        const status = error.response?.status
        const data = error.data as { code?: string; message?: string } | undefined
        const code =
            data?.code && KNOWN_CODES.has(data.code as TAccountErrorCode)
                ? (data.code as TAccountErrorCode)
                : status === 401
                  ? 'SESSION_EXPIRED'
                  : status === undefined
                    ? 'NETWORK_ERROR'
                    : 'UNKNOWN'

        return new AccountApiError(code, data?.message ?? error.message, status)
    }

    return new AccountApiError('NETWORK_ERROR', String(error), undefined)
}

export function createAccountApi(accountApiPath: string) {
    const client = ofetch.create({
        baseURL: accountApiPath,
        credentials: 'same-origin',
        retry: 0,
        headers: { Accept: 'application/json' }
    })

    return {
        async getSettings(): Promise<IAccountSettings> {
            try {
                return await client<IAccountSettings>(joinURL('/', 'settings'), {
                    query: { v: Date.now() }
                })
            } catch (error) {
                throw toAccountApiError(error)
            }
        },

        async getTrafficReset(): Promise<IAccountTrafficReset> {
            try {
                return await client<IAccountTrafficReset>(joinURL('/', 'traffic-reset'), {
                    query: { v: Date.now() }
                })
            } catch (error) {
                throw toAccountApiError(error)
            }
        },

        async getDevices(): Promise<IAccountDevices> {
            try {
                return await client<IAccountDevices>(joinURL('/', 'devices'), {
                    query: { v: Date.now() }
                })
            } catch (error) {
                throw toAccountApiError(error)
            }
        },

        async deleteDevice(hwid: string): Promise<IAccountDevices> {
            try {
                return await client<IAccountDevices>(joinURL('/', 'devices/delete'), {
                    method: 'POST',
                    body: { hwid }
                })
            } catch (error) {
                throw toAccountApiError(error)
            }
        },

        async setExternalSquad(externalSquadUuid: null | string): Promise<IAccountMutationResult> {
            try {
                return await client<IAccountMutationResult>(joinURL('/', 'external-squad'), {
                    method: 'POST',
                    body: { externalSquadUuid }
                })
            } catch (error) {
                throw toAccountApiError(error)
            }
        },

        async resetTraffic(): Promise<IAccountMutationResult> {
            try {
                return await client<IAccountMutationResult>(joinURL('/', 'reset-traffic'), {
                    method: 'POST'
                })
            } catch (error) {
                throw toAccountApiError(error)
            }
        }
    }
}

export type TAccountApi = ReturnType<typeof createAccountApi>
