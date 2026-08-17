import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDTO {
    @IsEmail()
    @MaxLength(255)
    email: string;

    @IsString()
    @MinLength(8, { message: 'Parol kamida 8 belgidan iborat bo\'lishi kerak' })
    @MaxLength(200)
    password: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;
}

export class LoginDTO {
    @IsEmail()
    @MaxLength(255)
    email: string;

    @IsString()
    @MinLength(1)
    @MaxLength(200)
    password: string;
}

export class RefreshDTO {
    @IsString()
    refreshToken: string;
}
