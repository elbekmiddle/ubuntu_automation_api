export const AUTH_ERROR_CODES = {
    EMAIL_ALREADY_EXISTS: 'AUTH_EMAIL_ALREADY_EXISTS',
    INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    TOO_MANY_ATTEMPTS: 'AUTH_TOO_MANY_ATTEMPTS',
    INVALID_REFRESH_TOKEN: 'AUTH_INVALID_REFRESH_TOKEN',
    USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
    MISSING_TOKEN: 'AUTH_MISSING_TOKEN',
    INVALID_ACCESS_TOKEN: 'AUTH_INVALID_ACCESS_TOKEN',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

export const AUTH_ERRORS = {
    [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]:
        'Bu email bilan foydalanuvchi allaqachon mavjud',

    [AUTH_ERROR_CODES.INVALID_CREDENTIALS]:
        'Email yoki parol noto\'g\'ri',

    [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]:
        'Juda ko\'p urinish — biroz kutib qayta urinib ko\'ring',

    [AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN]:
        'Refresh token yaroqsiz yoki muddati o\'tgan',

    [AUTH_ERROR_CODES.USER_NOT_FOUND]:
        'Foydalanuvchi topilmadi',

    [AUTH_ERROR_CODES.MISSING_TOKEN]:
        'Authorization header (Bearer token) yo\'q',

    [AUTH_ERROR_CODES.INVALID_ACCESS_TOKEN]:
        'Access token yaroqsiz yoki muddati o\'tgan',
} as const;
