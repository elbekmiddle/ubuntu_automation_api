export const FILE_ERROR_CODES = {
    INVALID_PATH: 'FILE_INVALID_PATH',
    NOT_FOUND: 'FILE_NOT_FOUND',
    CONTENT_REQUIRED: 'FILE_CONTENT_REQUIRED',
    WRITE_FAILED: 'FILE_WRITE_FAILED',
    LIST_FAILED: 'FILE_LIST_FAILED',
} as const;

export type FileErrorCode =
    typeof FILE_ERROR_CODES[keyof typeof FILE_ERROR_CODES];

export const FILE_ERRORS = {
    [FILE_ERROR_CODES.INVALID_PATH]:
        'Fayl yo\'li noto\'g\'ri yoki ruxsatsiz',

    [FILE_ERROR_CODES.NOT_FOUND]:
        'Fayl topilmadi',

    [FILE_ERROR_CODES.CONTENT_REQUIRED]:
        'Fayl kontenti bo\'sh bo\'lishi mumkin emas',

    [FILE_ERROR_CODES.WRITE_FAILED]:
        'Faylni saqlashda ichki xatolik yuz berdi',

    [FILE_ERROR_CODES.LIST_FAILED]:
        'Fayllar ro\'yxatini olishda xatolik yuz berdi',
} as const;
