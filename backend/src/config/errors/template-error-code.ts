export const TEMPLATE_ERROR_CODES = {
    INVALID_SLUG: 'TEMPLATE_INVALID_SLUG',
    NAME_REQUIRED: 'TEMPLATE_NAME_REQUIRED',
    ACTIONS_REQUIRED: 'TEMPLATE_ACTIONS_REQUIRED',
    INVALID_ACTION_NAME: 'TEMPLATE_INVALID_ACTION_NAME',
    ACTION_SCRIPT_REQUIRED: 'TEMPLATE_ACTION_SCRIPT_REQUIRED',
    DUPLICATE_ACTION_NAME: 'TEMPLATE_DUPLICATE_ACTION_NAME',
    ALREADY_EXISTS: 'TEMPLATE_ALREADY_EXISTS',
    CREATE_FAILED: 'TEMPLATE_CREATE_FAILED',
    NOT_FOUND: 'TEMPLATE_NOT_FOUND',
    NOT_OWNER: 'TEMPLATE_NOT_OWNER',
} as const;

export type TemplateErrorCode =
    typeof TEMPLATE_ERROR_CODES[keyof typeof TEMPLATE_ERROR_CODES];

export const TEMPLATE_ERRORS = {
    [TEMPLATE_ERROR_CODES.INVALID_SLUG]:
        'Slug faqat kichik harf, raqam va tire (-) bo‘lishi mumkin',

    [TEMPLATE_ERROR_CODES.NAME_REQUIRED]:
        'Name majburiy',

    [TEMPLATE_ERROR_CODES.ACTIONS_REQUIRED]:
        'Kamida bitta action kerak',

    [TEMPLATE_ERROR_CODES.INVALID_ACTION_NAME]:
        'Noto‘g‘ri action nomi',

    [TEMPLATE_ERROR_CODES.ACTION_SCRIPT_REQUIRED]:
        'Action script bo‘sh bo‘lishi mumkin emas',

    [TEMPLATE_ERROR_CODES.DUPLICATE_ACTION_NAME]:
        'Action nomlari takrorlanishi mumkin emas',

    [TEMPLATE_ERROR_CODES.ALREADY_EXISTS]:
        'Template allaqachon mavjud',

    [TEMPLATE_ERROR_CODES.CREATE_FAILED]:
        'Template yaratishda ichki xatolik yuz berdi',

    [TEMPLATE_ERROR_CODES.NOT_FOUND]:
        'Template topilmadi',

    [TEMPLATE_ERROR_CODES.NOT_OWNER]:
        'Bu templateni faqat egasi tahrirlashi mumkin',
} as const;