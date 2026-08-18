export const APP_ERROR_CODES = {
    NAME_REQUIRED: 'APP_NAME_REQUIRED',
    NOT_FOUND: 'APP_NOT_FOUND',
    INVALID_REGISTRATION: 'APP_INVALID_REGISTRATION',
} as const;

export type AppErrorCode = typeof APP_ERROR_CODES[keyof typeof APP_ERROR_CODES];

export const APP_ERRORS = {
    [APP_ERROR_CODES.NAME_REQUIRED]:
        'App nomi majburiy',

    [APP_ERROR_CODES.NOT_FOUND]:
        'App topilmadi',

    [APP_ERROR_CODES.INVALID_REGISTRATION]:
        'App ID yoki registration token noto\'g\'ri',
} as const;
