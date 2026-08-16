import { createHmac, createHash } from 'node:crypto';

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MediaKind, PropertyVisibility, type RequestMediaUpload } from '@ghar/shared';

import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../common/prisma.service';
import { verifyStreamSignature } from './stream-signature';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
  ) {}

  /**
   * Hand the client a direct-upload target so the file never passes through
   * the API. On a Pakistani mobile connection a 90-second video is the single
   * biggest payload in the product; proxying it would tie up a Node process
   * for minutes and double the bytes on the wire.
   *
   * Images → presigned S3 PUT to R2.
   * Video  → Cloudflare Stream one-time direct-upload URL, which also gives us
   *          adaptive bitrate transcoding we would otherwise have to build.
   */
  async requestUpload(agentId: string, input: RequestMediaUpload) {
    await this.billing.assertCanWrite(agentId);

    const property = await this.prisma.property.findFirst({
      where: { id: input.propertyId, agentId },
      select: { id: true, media: { select: { id: true, kind: true } } },
    });
    if (!property) throw new NotFoundException('property_not_found');

    // Caps are enforced here, not just in the client. An unbounded video
    // upload is a bandwidth bill someone else chose for you.
    if (input.kind === MediaKind.IMAGE && input.byteSize > MAX_IMAGE_BYTES) {
      throw new BadRequestException('image_too_large');
    }
    if (input.kind === MediaKind.VIDEO) {
      const maxBytes = Number(this.config.get<string>('VIDEO_MAX_BYTES') ?? 104_857_600);
      if (input.byteSize > maxBytes) throw new BadRequestException('video_too_large');

      const existingVideos = property.media.filter((m) => m.kind === MediaKind.VIDEO).length;
      if (existingVideos >= 1) throw new BadRequestException('one_video_per_listing');
    }

    if (property.media.length >= 20) throw new BadRequestException('too_many_media');

    const position = property.media.length;

    return input.kind === MediaKind.VIDEO
      ? this.createStreamUpload(input.propertyId, position)
      : this.createImageUpload(input.propertyId, position, input.contentType);
  }

  /**
   * Presigned target for a PAYMENT RECEIPT screenshot.
   *
   * Separate from requestUpload because a proof is not property media: it has
   * no propertyId, it must not appear in a listing's gallery, and it has to
   * work while the agent is RESTRICTED for non-payment — which is exactly when
   * `assertCanWrite` would refuse. An agent locked out for an unpaid invoice
   * who cannot upload the receipt that would unlock him is a support ticket
   * and a churned customer.
   */
  async requestProofUpload(agentId: string, contentType: string, byteSize: number) {
    if (!/^image\/(jpeg|png|webp|heic)$/.test(contentType)) {
      throw new BadRequestException('unsupported_proof_type');
    }
    if (byteSize > MAX_IMAGE_BYTES) throw new BadRequestException('image_too_large');

    // Namespaced by agent so a leaked key cannot be walked to another agent's
    // receipts, and timestamped so a re-upload never clobbers the first try.
    const key = `proofs/${agentId}/${Date.now()}-${createHash('sha256')
      .update(`${agentId}:${byteSize}:${Date.now()}`)
      .digest('hex')
      .slice(0, 12)}`;

    return {
      proofKey: key,
      method: 'PUT' as const,
      url: this.presignPut(key, contentType),
      headers: { 'content-type': contentType },
    };
  }

  private async createImageUpload(propertyId: string, position: number, contentType: string) {
    const key = `properties/${propertyId}/${position}-${Date.now()}`;

    const media = await this.prisma.propertyMedia.create({
      data: {
        propertyId,
        kind: MediaKind.IMAGE,
        position,
        storageKey: key,
        processingStatus: 'uploading',
      },
    });

    return {
      mediaId: media.id,
      kind: MediaKind.IMAGE,
      method: 'PUT' as const,
      url: this.presignPut(key, contentType),
      headers: { 'content-type': contentType },
    };
  }

  private async createStreamUpload(propertyId: string, position: number) {
    const accountId = this.config.getOrThrow<string>('CF_STREAM_ACCOUNT_ID');
    const token = this.config.getOrThrow<string>('CF_STREAM_TOKEN');
    const maxDuration = Number(this.config.get<string>('VIDEO_MAX_DURATION_SECONDS') ?? 90);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          maxDurationSeconds: maxDuration,
          requireSignedURLs: true,
          // Bound the window: a direct-upload URL is a bearer credential.
          expiry: new Date(Date.now() + 30 * 60_000).toISOString(),
          meta: { propertyId },
        }),
      },
    );

    if (!response.ok) {
      this.logger.error(`Cloudflare Stream direct_upload failed: ${response.status}`);
      throw new BadRequestException('video_upload_unavailable');
    }

    const payload = (await response.json()) as {
      result: { uid: string; uploadURL: string };
    };

    const media = await this.prisma.propertyMedia.create({
      data: {
        propertyId,
        kind: MediaKind.VIDEO,
        position,
        storageKey: payload.result.uid,
        streamUid: payload.result.uid,
        processingStatus: 'uploading',
      },
    });

    return {
      mediaId: media.id,
      kind: MediaKind.VIDEO,
      method: 'POST' as const,
      url: payload.result.uploadURL,
      headers: {},
    };
  }

  /**
   * Cloudflare Stream transcode webhook. Verified with the shared secret —
   * an unauthenticated webhook that flips media to `ready` would let anyone
   * publish an unprocessed listing.
   */
  async handleStreamWebhook(rawBody: string, signatureHeader: string | undefined): Promise<void> {
    const secret = this.config.getOrThrow<string>('CF_STREAM_WEBHOOK_SECRET');

    if (!verifyStreamSignature(secret, signatureHeader, rawBody)) {
      this.logger.warn('Rejected Cloudflare Stream webhook with a bad signature');
      throw new ForbiddenException('invalid_signature');
    }

    const event = JSON.parse(rawBody) as {
      uid: string;
      readyToStream: boolean;
      status?: { state: string };
      duration?: number;
      thumbnail?: string;
      playback?: { hls?: string };
    };

    const failed = event.status?.state === 'error';

    await this.prisma.propertyMedia.updateMany({
      where: { streamUid: event.uid },
      data: {
        processingStatus: failed ? 'failed' : event.readyToStream ? 'ready' : 'processing',
        durationSeconds: event.duration ?? undefined,
        thumbnailUrl: event.thumbnail ?? undefined,
        playbackUrl: event.playback?.hls ?? undefined,
      },
    });
  }

  /**
   * Playback URL for a viewer.
   *
   * For a `private` or `hidden_from_agents` listing this returns a SHORT-LIVED
   * SIGNED url. Without it the listing is protected but the video is not — the
   * media URL leaks even when the listing page correctly 404s, which is the
   * whole feature defeated.
   */
  async playbackUrlFor(mediaId: string, visibility: PropertyVisibility): Promise<string | null> {
    const media = await this.prisma.propertyMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.processingStatus !== 'ready') return null;

    if (visibility === PropertyVisibility.PUBLIC) return media.playbackUrl;
    if (!media.streamUid) return media.playbackUrl;

    return this.signStreamToken(media.streamUid);
  }

  private signStreamToken(uid: string): string {
    const ttl = Number(this.config.get<string>('MEDIA_SIGNED_URL_TTL_SECONDS') ?? 900);
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const key = this.config.getOrThrow<string>('CF_STREAM_TOKEN');

    const payload = Buffer.from(JSON.stringify({ sub: uid, exp })).toString('base64url');
    const signature = createHmac('sha256', key).update(payload).digest('base64url');

    return `https://videodelivery.net/${uid}/manifest/video.m3u8?token=${payload}.${signature}`;
  }

  /** Presigned S3 PUT for R2. */
  private presignPut(key: string, contentType: string): string {
    const endpoint = this.config.getOrThrow<string>('R2_ENDPOINT');
    const bucket = this.config.getOrThrow<string>('R2_BUCKET');
    const accessKey = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secret = this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY');
    const ttl = Number(this.config.get<string>('MEDIA_SIGNED_URL_TTL_SECONDS') ?? 900);

    // Minimal SigV4. Kept inline rather than pulling in the full AWS SDK — this
    // is the only S3 operation the API performs, and the SDK is ~4MB.
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const region = 'auto';
    const scope = `${dateStamp}/${region}/s3/aws4_request`;

    const query = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${accessKey}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(ttl),
      'X-Amz-SignedHeaders': 'content-type;host',
    });

    const host = new URL(endpoint).host;
    const canonicalRequest = [
      'PUT',
      `/${bucket}/${key}`,
      query.toString(),
      `content-type:${contentType}`,
      `host:${host}`,
      '',
      'content-type;host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const hmac = (key: Buffer | string, data: string): Buffer =>
      createHmac('sha256', key).update(data).digest();

    const signingKey = hmac(hmac(hmac(hmac(`AWS4${secret}`, dateStamp), region), 's3'), 'aws4_request');
    query.set('X-Amz-Signature', createHmac('sha256', signingKey).update(stringToSign).digest('hex'));

    return `${endpoint}/${bucket}/${key}?${query.toString()}`;
  }

  /** Confirm an image finished uploading. Videos flip to ready via webhook. */
  async confirmUpload(agentId: string, mediaId: string) {
    const media = await this.prisma.propertyMedia.findFirst({
      where: { id: mediaId, property: { agentId } },
    });
    if (!media) throw new NotFoundException('media_not_found');

    return this.prisma.propertyMedia.update({
      where: { id: mediaId },
      data: {
        processingStatus: 'ready',
        playbackUrl:
          media.kind === MediaKind.IMAGE
            ? `${this.config.getOrThrow<string>('R2_PUBLIC_BASE_URL')}/${media.storageKey}`
            : undefined,
        thumbnailUrl:
          media.kind === MediaKind.IMAGE
            ? `${this.config.getOrThrow<string>('R2_PUBLIC_BASE_URL')}/${media.storageKey}`
            : undefined,
      },
    });
  }

  async remove(agentId: string, mediaId: string): Promise<void> {
    const deleted = await this.prisma.propertyMedia.deleteMany({
      where: { id: mediaId, property: { agentId } },
    });
    if (deleted.count === 0) throw new NotFoundException('media_not_found');
  }
}
