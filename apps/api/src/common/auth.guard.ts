import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { UserRole, type Viewer } from '@ghar/shared';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Route is reachable without a token. Browsing is anonymous by design. */
export const Public = (): MethodDecorator => SetMetadata(IS_PUBLIC, true);

export const Roles = (...roles: UserRole[]): MethodDecorator => SetMetadata(ROLES, roles);

export interface AuthenticatedRequest extends Request {
  viewer: Viewer;
}

/** `@CurrentViewer() viewer: Viewer` — null userId/role for anonymous callers. */
export const CurrentViewer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Viewer =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().viewer,
);

/** `@AgentId() agentId: string` — throws if the caller is not an agent. */
export const AgentId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const { viewer } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!viewer.userId || viewer.role !== UserRole.AGENT) {
    throw new ForbiddenException('agent_account_required');
  }
  return viewer.userId;
});

/**
 * Attaches a Viewer to every request, authenticated or not.
 *
 * Public routes still get the token parsed when one is present — visibility
 * rules need to know whether an anonymous-looking request is actually a
 * competing agent, since `hidden_from_agents` listings must 404 for them.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractToken(request);
    request.viewer = { userId: null, role: null };

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; role: UserRole }>(token);
        request.viewer = { userId: payload.sub, role: payload.role };
      } catch {
        // An expired or malformed token on a public route is not an error —
        // the caller is simply anonymous.
        if (!isPublic) throw new UnauthorizedException('invalid_token');
      }
    } else if (!isPublic) {
      throw new UnauthorizedException('token_required');
    }

    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required?.length) {
      if (!request.viewer.role || !required.includes(request.viewer.role)) {
        throw new ForbiddenException('insufficient_role');
      }
    }

    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice(7) || null;
  }
}
