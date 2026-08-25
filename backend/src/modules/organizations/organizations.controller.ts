import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDTO } from './dto/create-organization.dto';
import { InviteMemberDTO } from './dto/invite-member.dto';
import { UpdateMemberRoleDTO } from './dto/update-member-role.dto';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

// `CurrentUser` decorator faqat userId qaytaradi — bu yerda email ham
// kerak (yangi org yaratilganda owner a'zoligini email bilan yozish
// uchun), shuning uchun request'dan to'g'ridan-to'g'ri o'qiydigan kichik
// qo'shimcha decorator. `DeviceTrackingMiddleware`/`JwtAuthGuard` orqali
// `req.userEmail` allaqachon o'rnatiladi (auth/jwt-auth.guard.ts'ga qarang).
const CurrentUserEmail = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.userEmail;
  },
);

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() body: CreateOrganizationDTO,
    @CurrentUserEmail() email: string,
  ) {
    return this.orgService.create(userId, email, body.name);
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.orgService.findAllForUser(userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('viewer', 'operator', 'developer', 'admin', 'owner')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.orgService.findOneForUser(userId, id);
  }

  @Get(':id/members')
  @UseGuards(RolesGuard)
  @Roles('viewer', 'operator', 'developer', 'admin', 'owner')
  listMembers(@Param('id') id: string) {
    return this.orgService.listMembers(id);
  }

  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  inviteMember(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: InviteMemberDTO,
  ) {
    return this.orgService.inviteMember(id, userId, body.email, body.role);
  }

  @Patch(':id/members/:memberId/role')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRoleDTO,
  ) {
    return this.orgService.updateMemberRole(id, memberId, body.role);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.orgService.removeMember(id, memberId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.orgService.remove(userId, id);
  }
}
