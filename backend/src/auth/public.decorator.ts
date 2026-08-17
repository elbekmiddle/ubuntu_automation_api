import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Bu route JWT tekshiruvisiz ochiq bo'ladi (masalan login, register, refresh). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
