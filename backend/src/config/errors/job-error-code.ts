export const JOB_ERROR_CODES = {
    TEMPLATE_SLUG_REQUIRED: 'JOB_TEMPLATE_SLUG_REQUIRED',
    ACTION_REQUIRED: 'JOB_ACTION_REQUIRED',
    ACTION_NOT_FOUND: 'JOB_ACTION_NOT_FOUND',
    ENQUEUE_FAILED: 'JOB_ENQUEUE_FAILED',
    NOT_FOUND: 'JOB_NOT_FOUND',
    DEVICE_NOT_FOUND: 'JOB_DEVICE_NOT_FOUND',
    DEVICE_OFFLINE: 'JOB_DEVICE_OFFLINE',
} as const;

export type JobErrorCode =
    typeof JOB_ERROR_CODES[keyof typeof JOB_ERROR_CODES];

export const JOB_ERRORS = {
    [JOB_ERROR_CODES.TEMPLATE_SLUG_REQUIRED]:
        'templateSlug majburiy',

    [JOB_ERROR_CODES.ACTION_REQUIRED]:
        'action majburiy',

    [JOB_ERROR_CODES.ACTION_NOT_FOUND]:
        'Ushbu template uchun bunday action mavjud emas',

    [JOB_ERROR_CODES.ENQUEUE_FAILED]:
        'Job navbatga qo\'shishda ichki xatolik yuz berdi',

    [JOB_ERROR_CODES.NOT_FOUND]:
        'Job topilmadi',

    [JOB_ERROR_CODES.DEVICE_NOT_FOUND]:
        'Ko\'rsatilgan device topilmadi',

    [JOB_ERROR_CODES.DEVICE_OFFLINE]:
        'Device hozir offline — job yuborib bo\'lmaydi',
} as const;
