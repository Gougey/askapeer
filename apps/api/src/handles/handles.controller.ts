import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { CreateHandleDto, HandleAvailabilityDto } from './handles.dto';
import { HandlesService } from './handles.service';

@Controller('handles')
export class HandlesController {
  constructor(private readonly handlesService: HandlesService) {}

  /**
   * As-you-type feedback for screen A6 (gap G-12). Pending-scoped: the caller is by
   * definition someone who does not have a handle yet.
   */
  @Get('availability')
  @UseGuards(JwtAuthGuard)
  availability(@Query() query: HandleAvailabilityDto) {
    return this.handlesService.checkAvailability(query.name);
  }

  /**
   * Claim the handle. Deliberately reachable with a pending token — this is the call
   * that mints the full one (EPIC-A §7, EPIC-B §5), so requiring a full session here
   * would be circular.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: Request & { member: AuthedMember }, @Body() dto: CreateHandleDto) {
    return this.handlesService.create(req.member.memberId, dto.handleName);
  }

  /** The member's own profile. Behind both gates, like every other in-app surface. */
  @Get('me')
  @UseGuards(JwtAuthGuard, AppAccessGuard)
  me(@Req() req: Request & { member: AuthedMember }) {
    return this.handlesService.getMine(req.member.handleId!);
  }

  /**
   * Another member's public profile (screen F2). Behind the gates too: profiles are
   * community content, and community content is for verified members only.
   *
   * Declared after `me` and `availability` so those literal paths win the route match.
   */
  @Get(':handleId')
  @UseGuards(JwtAuthGuard, AppAccessGuard)
  byId(@Param('handleId', ParseUUIDPipe) handleId: string) {
    return this.handlesService.getById(handleId);
  }
}
