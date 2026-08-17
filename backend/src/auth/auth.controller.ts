import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDTO, RegisterDTO, RefreshDTO } from './dto/auth.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    register(@Body() body: RegisterDTO, @Req() req: Request) {
        return this.authService.register(body.email, body.password, body.name ?? null, req.deviceId ?? null);
    }

    @Public()
    @Post('login')
    login(@Body() body: LoginDTO, @Req() req: Request) {
        return this.authService.login(body.email, body.password, req.deviceId ?? null);
    }

    @Public()
    @Post('refresh')
    refresh(@Body() body: RefreshDTO, @Req() req: Request) {
        return this.authService.refresh(body.refreshToken, req.deviceId ?? null);
    }

    @Public()
    @Post('logout')
    logout(@Body() body: RefreshDTO) {
        return this.authService.logout(body.refreshToken).then(() => ({ loggedOut: true }));
    }

    @Get('me')
    me(@CurrentUser() userId: string) {
        return this.authService.me(userId);
    }
}
