import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminOnly } from '../../common/decorators/admin.decorator';
import { AdminUserService } from './admin-user.service';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UpdateUserNoteDto } from './dto/update-user-note.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@AdminOnly()
@Controller('api/admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get('overview')
  getOverview() {
    return this.adminUserService.getOverview();
  }

  @Get()
  listUsers(@Query() query: UserListQueryDto) {
    return this.adminUserService.listUsers(query);
  }

  @Get(':id')
  getUserDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminUserService.getUserDetail(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserStatusDto,
    @CurrentUser('sub') actorId?: number,
  ) {
    return this.adminUserService.updateStatus(id, body.status, actorId);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserRoleDto,
    @CurrentUser('sub') actorId?: number,
  ) {
    return this.adminUserService.updateRole(id, body.role, actorId);
  }

  @Patch(':id/note')
  updateNote(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserNoteDto) {
    return this.adminUserService.updateNote(id, body.note);
  }
}

