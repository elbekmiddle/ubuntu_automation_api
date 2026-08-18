/**
 * Backend'dagi src/config/errors/*.ts fayllarida e'lon qilingan kodlar bilan
 * qo'lda sinxronlanadi. Yangi backend error code qo'shilsa, shu yerga ham
 * qo'shing — bo'lmasa CLI uni oddiy generic xabar sifatida ko'rsatadi
 * (baribir ishlayveradi, faqat maxsus xabar bermaydi).
 */
export enum ErrorCode {
    // auth
    AUTH_EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS',
    AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
    AUTH_TOO_MANY_ATTEMPTS = 'AUTH_TOO_MANY_ATTEMPTS',
    AUTH_INVALID_REFRESH_TOKEN = 'AUTH_INVALID_REFRESH_TOKEN',
    AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
    AUTH_MISSING_TOKEN = 'AUTH_MISSING_TOKEN',
    AUTH_INVALID_ACCESS_TOKEN = 'AUTH_INVALID_ACCESS_TOKEN',

    // apps
    APP_NAME_REQUIRED = 'APP_NAME_REQUIRED',
    APP_NOT_FOUND = 'APP_NOT_FOUND',
    APP_INVALID_REGISTRATION = 'APP_INVALID_REGISTRATION',

    // templates
    TEMPLATE_INVALID_SLUG = 'TEMPLATE_INVALID_SLUG',
    TEMPLATE_NAME_REQUIRED = 'TEMPLATE_NAME_REQUIRED',
    TEMPLATE_ACTIONS_REQUIRED = 'TEMPLATE_ACTIONS_REQUIRED',
    TEMPLATE_INVALID_ACTION_NAME = 'TEMPLATE_INVALID_ACTION_NAME',
    TEMPLATE_ACTION_SCRIPT_REQUIRED = 'TEMPLATE_ACTION_SCRIPT_REQUIRED',
    TEMPLATE_DUPLICATE_ACTION_NAME = 'TEMPLATE_DUPLICATE_ACTION_NAME',
    TEMPLATE_ALREADY_EXISTS = 'TEMPLATE_ALREADY_EXISTS',
    TEMPLATE_CREATE_FAILED = 'TEMPLATE_CREATE_FAILED',
    TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
    TEMPLATE_NOT_OWNER = 'TEMPLATE_NOT_OWNER',

    // common
    COMMON_INTERNAL_ERROR = 'COMMON_INTERNAL_ERROR',
    COMMON_VALIDATION_ERROR = 'COMMON_VALIDATION_ERROR',
    COMMON_NOT_FOUND = 'COMMON_NOT_FOUND',
}

/** Ba'zi kodlar uchun backend xabaridan ko'ra CLI'ga xosroq maslahat beramiz. */
export const ERROR_CODE_HINTS: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.AUTH_INVALID_ACCESS_TOKEN]: 'Sessiya tugagan bo\'lishi mumkin — "screenctl login" bilan qayta kiring.',
    [ErrorCode.AUTH_MISSING_TOKEN]: 'Avval "screenctl login" bilan kiring.',
    [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: 'Sessiyangiz tugagan — "screenctl login" bilan qayta kiring.',
    [ErrorCode.AUTH_TOO_MANY_ATTEMPTS]: 'Bir necha daqiqa kutib qayta urinib ko\'ring.',
};
