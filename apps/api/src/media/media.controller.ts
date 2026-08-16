import { Body, Controller, Delete, Headers, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { z } from 'zod';

import { requestMediaUploadSchema, type RequestMediaUpload } from '@ghar/shared';

const proofUploadSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|heic)$/),
  byteSize: z.number().int().positive(),
});

import { AgentId, Public } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload-url')
  async requestUpload(
    @AgentId() agentId: string,
    @Body(zodBody(requestMediaUploadSchema)) input: RequestMediaUpload,
  ) {
    return this.media.requestUpload(agentId, input);
  }

  /**
   * Upload target for a payment receipt. Deliberately NOT behind
   * `assertCanWrite` — a restricted agent must still be able to send the proof
   * that lifts the restriction.
   */
  @Post('proof-url')
  async requestProofUpload(
    @AgentId() agentId: string,
    @Body(zodBody(proofUploadSchema)) input: z.infer<typeof proofUploadSchema>,
  ) {
    return this.media.requestProofUpload(agentId, input.contentType, input.byteSize);
  }

  @Post(':id/confirm')
  async confirm(@AgentId() agentId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.confirmUpload(agentId, id);
  }

  @Delete(':id')
  async remove(@AgentId() agentId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.media.remove(agentId, id);
    return { ok: true };
  }

  /**
   * Cloudflare Stream transcode callback. Public because Cloudflare calls it —
   * authentication is the HMAC signature over the RAW body, which is why
   * `rawBody: true` is set in main.ts. Re-serialising the parsed body would
   * change whitespace and break the signature.
   */
  @Public()
  @Post('stream/webhook')
  async streamWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('webhook-signature') signature: string | undefined,
  ) {
    const raw = request.rawBody?.toString('utf8') ?? JSON.stringify(request.body);
    await this.media.handleStreamWebhook(raw, signature);
    return { ok: true };
  }
}
