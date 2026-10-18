import type { IncomingHttpHeaders } from 'node:http';

import axios, { AxiosError, AxiosInstance, RawAxiosResponseHeaders } from 'axios';
import { exit } from 'node:process';
import { table } from 'table';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
    DeleteUserHwidDeviceCommand,
    GetExternalSquadsCommand,
    GetMetadataCommand,
    GetSubpageConfigByShortUuidCommand,
    GetSubscriptionInfoByShortUuidCommand,
    GetSubpageConfigCommand,
    GetSubpageConfigsCommand,
    GetUserByShortUuidCommand,
    GetUserByUsernameCommand,
    GetUserHwidDevicesCommand,
    REMNAWAVE_REAL_IP_HEADER,
    ResetUserTrafficCommand,
    TRequestTemplateTypeKeys,
    UpdateUserCommand,
} from '@remnawave/backend-contract';

import { TypedConfigService } from '@common/config/app-config';
import { IGNORED_HEADERS } from '@common/constants';

import { ICommandResponse } from '../types/command-response.type';

@Injectable()
export class AxiosService implements OnModuleInit {
    private readonly logger = new Logger(AxiosService.name);
    private subpageVersion: string;

    public axiosInstance: AxiosInstance;

    constructor(private readonly configService: TypedConfigService) {
        this.axiosInstance = axios.create({
            baseURL: this.configService.getOrThrow('REMNAWAVE_PANEL_URL'),
            timeout: 10_000,
            headers: {
                'user-agent': 'Remnawave Subscription Page',
                'x-subpage-version': this.subpageVersion,
                Authorization: `Bearer ${this.configService.getOrThrow('REMNAWAVE_API_TOKEN')}`,
            },
        });

        const caddyAuthApiToken = this.configService.get('CADDY_AUTH_API_TOKEN');

        const cloudflareZeroTrustClientId = this.configService.get(
            'CLOUDFLARE_ZERO_TRUST_CLIENT_ID',
        );
        const cloudflareZeroTrustClientSecret = this.configService.get(
            'CLOUDFLARE_ZERO_TRUST_CLIENT_SECRET',
        );

        const egamesCookie = this.configService.get('EGAMES_COOKIE');

        if (caddyAuthApiToken) {
            this.axiosInstance.defaults.headers.common['X-Api-Key'] = caddyAuthApiToken;
        }

        if (cloudflareZeroTrustClientId && cloudflareZeroTrustClientSecret) {
            this.axiosInstance.defaults.headers.common['CF-Access-Client-Id'] =
                cloudflareZeroTrustClientId;
            this.axiosInstance.defaults.headers.common['CF-Access-Client-Secret'] =
                cloudflareZeroTrustClientSecret;
        }

        if (this.configService.getOrThrow('REMNAWAVE_PANEL_URL').startsWith('http://')) {
            this.axiosInstance.defaults.headers.common['X-Forwarded-For'] = '127.0.0.1';
            this.axiosInstance.defaults.headers.common['X-Forwarded-Proto'] = 'https';
        }

        if (egamesCookie) {
            this.axiosInstance.defaults.headers.common['Cookie'] = egamesCookie;
        }
    }

    async onModuleInit(): Promise<void> {
        this.subpageVersion = __RW_SUBPAGE_VERSION__;

        this.logger.log(`Remnawave API URL: ${this.axiosInstance.defaults.baseURL}`);

        const remnawaveMetadata = await this.getRemnawaveMetadata();
        if (!remnawaveMetadata.isOk || !remnawaveMetadata.remnawaveVersion) {
            this.logger.error(
                '\n' +
                    table([['Is the panel online and reachable from this server?']], {
                        header: {
                            content: `Connection to Remnawave Panel failed!`,
                            alignment: 'center',
                        },
                        columnDefault: {
                            width: 70,
                            alignment: 'center',
                            wrapWord: true,
                        },
                        drawVerticalLine: () => false,
                    }) +
                    '\n',
            );
            this.logger.error(remnawaveMetadata.error);

            exit(1);
        } else {
            this.logger.log(`[OK] Connected to Remnawave v${remnawaveMetadata.remnawaveVersion}`);
        }
    }

    public async getRemnawaveMetadata(): Promise<{
        isOk: boolean;
        remnawaveVersion?: string;
        error?: unknown;
    }> {
        try {
            const response = await this.axiosInstance.request<GetMetadataCommand.Response>({
                method: GetMetadataCommand.endpointDetails.REQUEST_METHOD,
                url: GetMetadataCommand.url,
            });

            await GetMetadataCommand.ResponseSchema.parseAsync(response.data);

            return {
                isOk: true,
                remnawaveVersion: response.data.response.version,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                return {
                    isOk: false,
                    error: error.message,
                };
            } else {
                return {
                    isOk: false,
                    error: error,
                };
            }
        }
    }

    public async getUserByUsername(
        clientIp: string,
        username: string,
    ): Promise<ICommandResponse<GetUserByUsernameCommand.Response>> {
        try {
            const response = await this.axiosInstance.request<GetUserByUsernameCommand.Response>({
                method: GetUserByUsernameCommand.endpointDetails.REQUEST_METHOD,
                url: GetUserByUsernameCommand.url(encodeURIComponent(username)),
                headers: {
                    [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                },
            });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Error in Axios GetUserByUsername Request:', error.message);

                return {
                    isOk: false,
                };
            } else {
                this.logger.error('Error in GetUserByUsername Request:', error);

                return {
                    isOk: false,
                };
            }
        }
    }

    public async getUserByShortUuid(
        clientIp: string,
        shortUuid: string,
    ): Promise<ICommandResponse<GetUserByShortUuidCommand.Response['response']>> {
        try {
            const response = await this.axiosInstance.request<GetUserByShortUuidCommand.Response>({
                method: GetUserByShortUuidCommand.endpointDetails.REQUEST_METHOD,
                url: GetUserByShortUuidCommand.url(encodeURIComponent(shortUuid)),
                headers: {
                    [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                },
            });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            return this.handleCommandError('GetUserByShortUuid', error);
        }
    }

    public async updateUserExternalSquad(
        clientIp: string,
        userId: number,
        externalSquadUuid: string | null,
    ): Promise<ICommandResponse<UpdateUserCommand.Response['response']>> {
        try {
            const body: UpdateUserCommand.RequestBody = {
                id: userId,
                externalSquadUuid,
            };

            const response = await this.axiosInstance.request<UpdateUserCommand.Response>({
                method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
                url: UpdateUserCommand.url,
                data: body,
                headers: {
                    [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                },
            });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            return this.handleCommandError('UpdateUserExternalSquad', error);
        }
    }

    public async resetUserTraffic(
        clientIp: string,
        userId: number,
    ): Promise<ICommandResponse<ResetUserTrafficCommand.Response['response']>> {
        try {
            const response = await this.axiosInstance.request<ResetUserTrafficCommand.Response>({
                method: ResetUserTrafficCommand.endpointDetails.REQUEST_METHOD,
                url: ResetUserTrafficCommand.url(String(userId)),
                headers: {
                    [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                },
            });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            return this.handleCommandError('ResetUserTraffic', error);
        }
    }

    public async getUserHwidDevices(
        clientIp: string,
        userId: number,
    ): Promise<ICommandResponse<GetUserHwidDevicesCommand.Response['response']>> {
        try {
            const response = await this.axiosInstance.request<GetUserHwidDevicesCommand.Response>({
                method: GetUserHwidDevicesCommand.endpointDetails.REQUEST_METHOD,
                url: GetUserHwidDevicesCommand.url(String(userId)),
                headers: {
                    [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                },
            });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            return this.handleCommandError('GetUserHwidDevices', error);
        }
    }

    public async deleteUserHwidDevice(
        clientIp: string,
        userId: number,
        hwid: string,
    ): Promise<ICommandResponse<DeleteUserHwidDeviceCommand.Response['response']>> {
        try {
            const body: DeleteUserHwidDeviceCommand.RequestBody = { userId, hwid };

            const response = await this.axiosInstance.request<DeleteUserHwidDeviceCommand.Response>(
                {
                    method: DeleteUserHwidDeviceCommand.endpointDetails.REQUEST_METHOD,
                    url: DeleteUserHwidDeviceCommand.url,
                    data: body,
                    headers: {
                        [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                    },
                },
            );

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            return this.handleCommandError('DeleteUserHwidDevice', error);
        }
    }

    public async getExternalSquads(): Promise<
        ICommandResponse<GetExternalSquadsCommand.Response['response']>
    > {
        try {
            const response = await this.axiosInstance.request<GetExternalSquadsCommand.Response>({
                method: GetExternalSquadsCommand.endpointDetails.REQUEST_METHOD,
                url: GetExternalSquadsCommand.url,
            });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            return this.handleCommandError('GetExternalSquads', error);
        }
    }

    private handleCommandError(commandName: string, error: unknown): ICommandResponse<never> {
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const body = error.response?.data as { message?: string } | undefined;

            this.logger.error(
                `Error in ${commandName} Request: ${error.message}${
                    body?.message ? ` (${body.message})` : ''
                }`,
            );

            return {
                isOk: false,
                code: status ? String(status) : undefined,
                message: body?.message ?? error.message,
            };
        }

        this.logger.error(`Error in ${commandName} Request:`, error);

        return { isOk: false };
    }

    public async getSubscriptionPageConfigByUuid(
        uuid: string,
    ): Promise<ICommandResponse<GetSubpageConfigCommand.Response['response']>> {
        try {
            const response = await this.axiosInstance.request<GetSubpageConfigCommand.Response>({
                method: GetSubpageConfigCommand.endpointDetails.REQUEST_METHOD,
                url: GetSubpageConfigCommand.url(encodeURIComponent(uuid)),
            });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            this.logger.error('Error in GetSubscriptionPageConfigByUuid Request:', error);

            return { isOk: false };
        }
    }

    public async getSubscriptionPageConfigList(): Promise<
        ICommandResponse<GetSubpageConfigsCommand.Response['response']>
    > {
        try {
            const response = await this.axiosInstance.request<GetSubpageConfigsCommand.Response>({
                method: GetSubpageConfigsCommand.endpointDetails.REQUEST_METHOD,
                url: GetSubpageConfigsCommand.url,
            });

            const validationResult = await GetSubpageConfigsCommand.ResponseSchema.parseAsync(
                response.data,
            );

            return {
                isOk: true,
                response: validationResult.response,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                if (error.response?.status === 404) {
                    this.logger.error('Request failed with 404 status code.');
                    this.logger.error(
                        'This version of Subscription Page requires Remnawave Panel version >=2.4.0. Please upgrade Remnawave Panel to the latest version or downgrade Subscription Page.',
                    );
                    return { isOk: false };
                }

                this.logger.error(`Subpage Config List Request failed: ${error.message}`);
                return { isOk: false };
            } else {
                this.logger.error(`Subpage Config List Request failed: ${error}`);
                return { isOk: false };
            }
        }
    }

    public async getSubscriptionInfo(
        clientIp: string,
        shortUuid: string,
    ): Promise<ICommandResponse<GetSubscriptionInfoByShortUuidCommand.Response>> {
        try {
            const response =
                await this.axiosInstance.request<GetSubscriptionInfoByShortUuidCommand.Response>({
                    method: GetSubscriptionInfoByShortUuidCommand.endpointDetails.REQUEST_METHOD,
                    url: GetSubscriptionInfoByShortUuidCommand.url(encodeURIComponent(shortUuid)),
                    headers: {
                        [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                    },
                });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError && error.response?.status === 404) {
                this.logger.debug(`GetSubscriptionInfo: subscription not found (${shortUuid})`);

                return { isOk: false, code: '404' };
            }

            return this.handleCommandError('GetSubscriptionInfo', error);
        }
    }

    public async getSubpageConfig(
        shortUuid: string,
        requestHeaders: IncomingHttpHeaders,
    ): Promise<ICommandResponse<GetSubpageConfigByShortUuidCommand.Response['response']>> {
        try {
            const response =
                await this.axiosInstance.request<GetSubpageConfigByShortUuidCommand.Response>({
                    method: GetSubpageConfigByShortUuidCommand.endpointDetails.REQUEST_METHOD,
                    url: GetSubpageConfigByShortUuidCommand.url(encodeURIComponent(shortUuid)),
                    data: {
                        requestHeaders,
                    },
                });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            this.logger.error('Error in GetSubpageConfig Request:', error);
            return { isOk: false };
        }
    }

    public async getSubscription(
        clientIp: string,
        shortUuid: string,
        headers: NodeJS.Dict<string | string[]>,
        withClientType: boolean = false,
        clientType?: TRequestTemplateTypeKeys,
    ): Promise<
        | { kind: 'ok'; subscription: Buffer; headers: RawAxiosResponseHeaders }
        | { kind: 'not_found' }
        | { kind: 'error' }
    > {
        try {
            let basePath = 'api/sub/' + encodeURIComponent(shortUuid);

            if (withClientType && clientType) {
                basePath += '/' + encodeURIComponent(clientType);
            }

            const response = await this.axiosInstance.request<Buffer>({
                method: 'GET',
                url: basePath,
                responseType: 'arraybuffer',
                headers: {
                    ...headers,
                    Accept: '*/*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
                    Pragma: 'no-cache',
                    Expires: '0',
                    [REMNAWAVE_REAL_IP_HEADER]: clientIp,
                    Authorization: undefined,
                },
            });

            return {
                kind: 'ok',
                subscription: response.data,
                headers: Object.fromEntries(
                    Object.entries(response.headers).filter(([key]) => !IGNORED_HEADERS.has(key)),
                ),
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                if (error.response?.status === 404) {
                    return { kind: 'not_found' };
                }

                this.logger.error(`Error in GetSubscription Request: ${error.message}`);
            } else {
                this.logger.error(`Error in GetSubscription Request: ${error}`);
            }

            return { kind: 'error' };
        }
    }
}
