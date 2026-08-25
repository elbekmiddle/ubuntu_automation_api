export const ORG_ERROR_CODES = {
  NAME_REQUIRED: 'ORG_NAME_REQUIRED',
  NOT_FOUND: 'ORG_NOT_FOUND',
  NOT_A_MEMBER: 'ORG_NOT_A_MEMBER',
  INSUFFICIENT_ROLE: 'ORG_INSUFFICIENT_ROLE',
  MEMBER_NOT_FOUND: 'ORG_MEMBER_NOT_FOUND',
  ALREADY_A_MEMBER: 'ORG_ALREADY_A_MEMBER',
  CANNOT_MODIFY_OWNER: 'ORG_CANNOT_MODIFY_OWNER',
  ONLY_OWNER_CAN_DELETE: 'ORG_ONLY_OWNER_CAN_DELETE',
} as const;

export type OrgErrorCode =
  (typeof ORG_ERROR_CODES)[keyof typeof ORG_ERROR_CODES];

export const ORG_ERRORS = {
  [ORG_ERROR_CODES.NAME_REQUIRED]: 'Tashkilot nomi majburiy',
  [ORG_ERROR_CODES.NOT_FOUND]: 'Tashkilot topilmadi',
  [ORG_ERROR_CODES.NOT_A_MEMBER]: "Siz bu tashkilot a'zosi emassiz",
  [ORG_ERROR_CODES.INSUFFICIENT_ROLE]: 'Bu amal uchun huquqingiz yetarli emas',
  [ORG_ERROR_CODES.MEMBER_NOT_FOUND]: "A'zo topilmadi",
  [ORG_ERROR_CODES.ALREADY_A_MEMBER]:
    "Bu email allaqachon a'zo (yoki taklif qilingan)",
  [ORG_ERROR_CODES.CANNOT_MODIFY_OWNER]:
    "Owner rolini o'zgartirib yoki uni olib tashlab bo'lmaydi",
  [ORG_ERROR_CODES.ONLY_OWNER_CAN_DELETE]:
    "Faqat owner tashkilotni o'chira oladi",
} as const;
