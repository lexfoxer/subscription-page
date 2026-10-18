/**
 * Texts for the self-service settings page. They are not part of the Remnawave
 * subpage config (baseTranslations), so they live here. Missing languages fall back
 * to English.
 */
const en = {
    settingsTitle: 'Settings',
    settingsTooltip: 'Subscription settings',
    backToSubscription: 'Back to subscription',
    loadingError: 'Could not load settings',
    retry: 'Retry',
    sessionExpiredTitle: 'Session expired',
    sessionExpiredText: 'Open the subscription page again to continue.',
    reloadPage: 'Reload page',

    squadTitle: 'Happ configuration',
    squadDescription:
        'Choose which Happ configuration your subscription delivers. The choice applies to all your devices. After applying, press the subscription refresh button in Happ.',
    squadDetected: 'Detected device: {{platform}}',
    squadRecommended: 'Recommended',
    squadForPlatforms: 'For: {{platforms}}',
    squadAnyPlatform: 'Any device',
    squadDefaultOption: 'Default',
    squadDefaultDescription: 'Standard configuration assigned by the provider',
    squadCurrentCustom: 'Your current configuration was assigned manually: {{name}}',
    squadSave: 'Apply',
    squadSaved: 'Happ configuration switched',
    squadSavedText: 'Now press the subscription refresh button in Happ.',
    squadNoOptions: 'No configurations are available for selection.',

    resetTitle: 'Traffic reset',
    resetDescription:
        'If you run out of traffic before the end of the billing period, you can reset the counter yourself a limited number of times per month.',
    resetUsage: 'Used {{used}} of {{limit}}',
    resetUnlimited: 'Used {{used}}, no traffic limit',
    resetRemaining: 'Resets left this month: {{remaining}} of {{limit}}',
    resetRenews: 'Quota renews on {{date}}',
    resetLastAt: 'Last reset: {{date}}',
    resetButton: 'Reset traffic',
    resetConfirmTitle: 'Reset traffic?',
    resetConfirmText:
        'Your used traffic will be set to zero. You have {{remaining}} of {{limit}} resets left this month.',
    resetConfirm: 'Yes, reset',
    resetCancel: 'Cancel',
    resetDone: 'Traffic has been reset',
    resetDoneText: 'Your counter is back to zero.',
    resetBlockedLimit: 'You have used all resets for this month.',
    resetBlockedUnlimited: 'Your subscription has no traffic limit, nothing to reset.',
    resetBlockedInactive: 'Traffic can be reset only for an active subscription.',

    errorGeneric: 'Something went wrong. Please try again later.',
    errorRemnawave: 'The provider panel did not accept the request. Please try again later.',
    errorNotAllowed: 'This option is not available.',
    errorLimitReached: 'Monthly reset limit reached.',

    platformIos: 'iOS',
    platformAndroid: 'Android',
    platformMacos: 'macOS',
    platformWindows: 'Windows',
    platformLinux: 'Linux',
    platformAndroidTV: 'Android TV',
    platformAppleTV: 'Apple TV',
    platformUnknown: 'unknown'
}

export type TAccountTranslationKey = keyof typeof en
export type TAccountTranslations = Record<TAccountTranslationKey, string>

const ru: TAccountTranslations = {
    settingsTitle: 'Настройки',
    settingsTooltip: 'Настройки подписки',
    backToSubscription: 'Назад к подписке',
    loadingError: 'Не удалось загрузить настройки',
    retry: 'Повторить',
    sessionExpiredTitle: 'Сессия истекла',
    sessionExpiredText: 'Откройте страницу подписки заново, чтобы продолжить.',
    reloadPage: 'Обновить страницу',

    squadTitle: 'Конфигурация Happ',
    squadDescription:
        'Выберите, какую конфигурацию Happ отдаёт ваша подписка. Выбор действует для всех ваших устройств. После применения нажмите кнопку обновления подписки в Happ.',
    squadDetected: 'Ваше устройство: {{platform}}',
    squadRecommended: 'Рекомендуется',
    squadForPlatforms: 'Для: {{platforms}}',
    squadAnyPlatform: 'Любое устройство',
    squadDefaultOption: 'По умолчанию',
    squadDefaultDescription: 'Стандартная конфигурация, назначенная провайдером',
    squadCurrentCustom: 'Текущая конфигурация назначена вручную: {{name}}',
    squadSave: 'Применить',
    squadSaved: 'Конфигурация Happ переключена',
    squadSavedText: 'Теперь нажмите кнопку обновления подписки в Happ.',
    squadNoOptions: 'Нет доступных для выбора конфигураций.',

    resetTitle: 'Сброс трафика',
    resetDescription:
        'Если трафик закончился до конца периода, вы можете самостоятельно обнулить счётчик — ограниченное число раз в месяц.',
    resetUsage: 'Использовано {{used}} из {{limit}}',
    resetUnlimited: 'Использовано {{used}}, лимита трафика нет',
    resetRemaining: 'Сбросов осталось в этом месяце: {{remaining}} из {{limit}}',
    resetRenews: 'Лимит сбросов обновится {{date}}',
    resetLastAt: 'Последний сброс: {{date}}',
    resetButton: 'Сбросить трафик',
    resetConfirmTitle: 'Сбросить трафик?',
    resetConfirmText:
        'Использованный трафик обнулится. В этом месяце у вас осталось сбросов: {{remaining}} из {{limit}}.',
    resetConfirm: 'Да, сбросить',
    resetCancel: 'Отмена',
    resetDone: 'Трафик сброшен',
    resetDoneText: 'Счётчик обнулён.',
    resetBlockedLimit: 'Вы использовали все сбросы в этом месяце.',
    resetBlockedUnlimited: 'У вашей подписки нет лимита трафика, сбрасывать нечего.',
    resetBlockedInactive: 'Сброс трафика доступен только для активной подписки.',

    errorGeneric: 'Что-то пошло не так. Попробуйте позже.',
    errorRemnawave: 'Панель провайдера не приняла запрос. Попробуйте позже.',
    errorNotAllowed: 'Этот вариант недоступен.',
    errorLimitReached: 'Достигнут месячный лимит сбросов.',

    platformIos: 'iOS',
    platformAndroid: 'Android',
    platformMacos: 'macOS',
    platformWindows: 'Windows',
    platformLinux: 'Linux',
    platformAndroidTV: 'Android TV',
    platformAppleTV: 'Apple TV',
    platformUnknown: 'неизвестно'
}

export const ACCOUNT_TRANSLATIONS: Record<string, TAccountTranslations> = {
    en,
    ru
}

export const ACCOUNT_DEFAULT_TRANSLATIONS: TAccountTranslations = en
