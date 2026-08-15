export const SYSTEM_ERROR_CODES = {
    FETCH_FAILED: 'SYSTEM_FETCH_FAILED',
    DOCKER_UNAVAILABLE: 'SYSTEM_DOCKER_UNAVAILABLE',
} as const;

export type SystemErrorCode =
    typeof SYSTEM_ERROR_CODES[keyof typeof SYSTEM_ERROR_CODES];

export const SYSTEM_ERRORS = {
    [SYSTEM_ERROR_CODES.FETCH_FAILED]:
        'Tizim ma\'lumotlarini olishda ichki xatolik yuz berdi',

    [SYSTEM_ERROR_CODES.DOCKER_UNAVAILABLE]:
        'Docker mavjud emas yoki ishlamayapti',
} as const;
