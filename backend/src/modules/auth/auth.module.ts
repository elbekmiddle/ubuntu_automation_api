import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DatabaseModule } from '../../database/database.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersRepository } from './users.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtGuard } from './optional-jwt.guard';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    DatabaseModule,

    // OrganizationsModule ham AuthModule'ni import qiladi (RolesGuard
    // organization a'zoligini tekshirish uchun JwtAuthGuard'dan
    // foydalanadi emas, lekin OrganizationsService AuthModule orqali
    // ro'yxatdan o'tish oqimiga ulanadi) — shuning uchun forwardRef.
    forwardRef(() => OrganizationsModule),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),

        signOptions: {
          expiresIn: Number(
            config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? 15 * 60,
          ),
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    UsersRepository,
    RefreshTokensRepository,
    JwtAuthGuard,
    OptionalJwtGuard,
  ],

  exports: [JwtAuthGuard, OptionalJwtGuard, JwtModule],
})
export class AuthModule {}
