import { createHash, randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Locale, PlanCode, UserRole, type OtpVerify } from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';
import { OtpService } from './otp.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
  ) {}

  async requestOtp(phone: string) {
    return this.otp.request(phone);
  }

  /**
   * Verify the code and sign in. The account is created on first successful
   * verification — there is no separate "sign up" step, because asking a user
   * to choose between two buttons before they've seen anything is a drop-off
   * point with no upside.
   */
  async verifyOtp(input: OtpVerify, userAgent: string | null): Promise<AuthTokens & { isNew: boolean }> {
    const ok = await this.otp.verify(input.phone, input.code);
    if (!ok) throw new UnauthorizedException({ code: 'otp_invalid' });

    const existing = await this.prisma.user.findUnique({ where: { phone: input.phone } });

    const user =
      existing ??
      (await this.prisma.user.create({
        data: { phone: input.phone, role: UserRole.CUSTOMER, locale: Locale.UR },
      }));

    const tokens = await this.issueTokens(user.id, user.role as UserRole, input.deviceId, userAgent);
    return { ...tokens, isNew: existing === null };
  }

  /**
   * Turn a customer account into an agent account. Creates the Agent row and a
   * subscription in `trialing` — the agent gets the create-listing flow before
   * being asked for money, which is the whole point of the 3 free listings.
   */
  async becomeAgent(userId: string, agencyName: string | null, city: string | null) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role: UserRole.AGENT } });

      await tx.agent.upsert({
        where: { userId },
        update: { agencyName, city },
        create: { userId, agencyName, city },
      });

      await tx.subscription.upsert({
        where: { agentId: userId },
        update: {},
        create: {
          agentId: userId,
          planCode: PlanCode.BASIC,
          status: 'trialing',
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000),
        },
      });

      return tx.agent.findUniqueOrThrow({ where: { userId } });
    });
  }

  async refresh(refreshToken: string, userAgent: string | null): Promise<AuthTokens> {
    const hash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, role: true, status: true } } },
    });

    if (!session || session.user.status !== 'active') {
      throw new UnauthorizedException('invalid_refresh_token');
    }

    // Rotate: the old refresh token dies the moment it is used, so a stolen
    // one is good for a single request and its reuse is detectable.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      session.user.id,
      session.user.role as UserRole,
      session.deviceId,
      userAgent,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: string,
    role: UserRole,
    deviceId: string | null | undefined,
    userAgent: string | null,
  ): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      { expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m' },
    );

    // Opaque random string, not a JWT: refresh tokens are revocable, and a
    // revocable credential must be looked up rather than merely verified.
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        deviceId: deviceId ?? null,
        userAgent: userAgent?.slice(0, 300) ?? null,
        expiresAt: new Date(Date.now() + 60 * 86_400_000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
