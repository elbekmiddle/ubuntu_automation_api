import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersRepository } from './users.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
    imports: [
        DatabaseModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 15 * 60) },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, UsersRepository, RefreshTokensRepository, JwtAuthGuard],
    exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
