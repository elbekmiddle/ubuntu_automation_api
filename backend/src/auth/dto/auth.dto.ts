import {
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class RegisterDTO {
    @IsEmail({}, { message: 'Email noto‘g‘ri formatda' })
    @MaxLength(255, { message: 'Email 255 belgidan oshmasligi kerak' })
    email: string;

    @IsString()
    @MinLength(8, {
        message: 'Parol kamida 8 belgidan iborat bo‘lishi kerak',
    })
    @MaxLength(200, {
        message: 'Parol 200 belgidan oshmasligi kerak',
    })
    password: string;

    @IsOptional()
    @IsString()
    @MinLength(1, {
        message: 'Ism bo‘sh bo‘lishi mumkin emas',
    })
    @MaxLength(100, {
        message: 'Ism 100 belgidan oshmasligi kerak',
    })
    name?: string;
}

export class LoginDTO {
    @IsEmail({}, { message: 'Email noto‘g‘ri formatda' })
    @MaxLength(255)
    email: string;

    @IsString()
    @MinLength(1, {
        message: 'Parol kiritilishi kerak',
    })
    @MaxLength(200)
    password: string;
}

export class RefreshDTO {
    @IsString()
    @MinLength(1, {
        message: 'Refresh token kiritilishi kerak',
    })
    refreshToken: string;
}