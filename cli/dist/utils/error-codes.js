/**
 * Backend'dagi src/config/errors/*.ts fayllarida e'lon qilingan kodlar bilan
 * qo'lda sinxronlanadi. Yangi backend error code qo'shilsa, shu yerga ham
 * qo'shing — bo'lmasa CLI uni oddiy generic xabar sifatida ko'rsatadi
 * (baribir ishlayveradi, faqat maxsus xabar bermaydi).
 */
export var ErrorCode;
(function (ErrorCode) {
    // auth
    ErrorCode["AUTH_EMAIL_ALREADY_EXISTS"] = "AUTH_EMAIL_ALREADY_EXISTS";
    ErrorCode["AUTH_INVALID_CREDENTIALS"] = "AUTH_INVALID_CREDENTIALS";
    ErrorCode["AUTH_TOO_MANY_ATTEMPTS"] = "AUTH_TOO_MANY_ATTEMPTS";
    ErrorCode["AUTH_INVALID_REFRESH_TOKEN"] = "AUTH_INVALID_REFRESH_TOKEN";
    ErrorCode["AUTH_USER_NOT_FOUND"] = "AUTH_USER_NOT_FOUND";
    ErrorCode["AUTH_MISSING_TOKEN"] = "AUTH_MISSING_TOKEN";
    ErrorCode["AUTH_INVALID_ACCESS_TOKEN"] = "AUTH_INVALID_ACCESS_TOKEN";
    // apps
    ErrorCode["APP_NAME_REQUIRED"] = "APP_NAME_REQUIRED";
    ErrorCode["APP_NOT_FOUND"] = "APP_NOT_FOUND";
    ErrorCode["APP_INVALID_REGISTRATION"] = "APP_INVALID_REGISTRATION";
    // templates
    ErrorCode["TEMPLATE_INVALID_SLUG"] = "TEMPLATE_INVALID_SLUG";
    ErrorCode["TEMPLATE_NAME_REQUIRED"] = "TEMPLATE_NAME_REQUIRED";
    ErrorCode["TEMPLATE_ACTIONS_REQUIRED"] = "TEMPLATE_ACTIONS_REQUIRED";
    ErrorCode["TEMPLATE_INVALID_ACTION_NAME"] = "TEMPLATE_INVALID_ACTION_NAME";
    ErrorCode["TEMPLATE_ACTION_SCRIPT_REQUIRED"] = "TEMPLATE_ACTION_SCRIPT_REQUIRED";
    ErrorCode["TEMPLATE_DUPLICATE_ACTION_NAME"] = "TEMPLATE_DUPLICATE_ACTION_NAME";
    ErrorCode["TEMPLATE_ALREADY_EXISTS"] = "TEMPLATE_ALREADY_EXISTS";
    ErrorCode["TEMPLATE_CREATE_FAILED"] = "TEMPLATE_CREATE_FAILED";
    ErrorCode["TEMPLATE_NOT_FOUND"] = "TEMPLATE_NOT_FOUND";
    ErrorCode["TEMPLATE_NOT_OWNER"] = "TEMPLATE_NOT_OWNER";
    // common
    ErrorCode["COMMON_INTERNAL_ERROR"] = "COMMON_INTERNAL_ERROR";
    ErrorCode["COMMON_VALIDATION_ERROR"] = "COMMON_VALIDATION_ERROR";
    ErrorCode["COMMON_NOT_FOUND"] = "COMMON_NOT_FOUND";
})(ErrorCode || (ErrorCode = {}));
/** Ba'zi kodlar uchun backend xabaridan ko'ra CLI'ga xosroq maslahat beramiz. */
export const ERROR_CODE_HINTS = {
    [ErrorCode.AUTH_INVALID_ACCESS_TOKEN]: 'Sessiya tugagan bo\'lishi mumkin — "screenctl login" bilan qayta kiring.',
    [ErrorCode.AUTH_MISSING_TOKEN]: 'Avval "screenctl login" bilan kiring.',
    [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: 'Sessiyangiz tugagan — "screenctl login" bilan qayta kiring.',
    [ErrorCode.AUTH_TOO_MANY_ATTEMPTS]: 'Bir necha daqiqa kutib qayta urinib ko\'ring.',
};
