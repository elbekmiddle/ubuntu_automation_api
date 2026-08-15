export const COMMON_ERROR_CODES = {
    INTERNAL_ERROR: 'COMMON_INTERNAL_ERROR',
    VALIDATION_ERROR: 'COMMON_VALIDATION_ERROR',
    NOT_FOUND: 'COMMON_NOT_FOUND',
} as const;

export type CommonErrorCode =
    typeof COMMON_ERROR_CODES[keyof typeof COMMON_ERROR_CODES];

export const COMMON_ERRORS = {
    [COMMON_ERROR_CODES.INTERNAL_ERROR]:
        'Ichki server xatoligi yuz berdi',

    [COMMON_ERROR_CODES.VALIDATION_ERROR]:
        'Yuborilgan ma\'lumotlar noto\'g\'ri',

    [COMMON_ERROR_CODES.NOT_FOUND]:
        'So\'ralgan resurs topilmadi',
} as const;
