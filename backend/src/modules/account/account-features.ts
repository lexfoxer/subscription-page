import { TypedConfigService } from '@common/config/app-config';

export interface IAccountFeatures {
    enabled: boolean;
    externalSquads: boolean;
    trafficReset: boolean;
    devices: boolean;
}

/**
 * Which self-service features are switched on by the environment.
 * Shared by the webpage (to decide whether to render the settings entry point)
 * and the account API (to reject calls to disabled features).
 */
export function getAccountFeatures(configService: TypedConfigService): IAccountFeatures {
    const externalSquads =
        configService.getOrThrow('EXTERNAL_SQUADS_SELECTABLE').mode !== 'disabled';
    const trafficReset = configService.getOrThrow('TRAFFIC_RESET_LIMIT_PER_MONTH') > 0;
    const devices = configService.getOrThrow('DEVICES_MANAGEMENT_ENABLED');

    return {
        enabled: externalSquads || trafficReset || devices,
        externalSquads,
        trafficReset,
        devices,
    };
}
