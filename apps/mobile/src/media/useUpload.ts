import { useCallback, useState } from 'react';

import { MediaKind } from '@ghar/shared';

import { api } from '../api/client';

interface UploadTarget {
  mediaId: string;
  kind: MediaKind;
  method: 'PUT' | 'POST';
  url: string;
  headers: Record<string, string>;
}

export interface UploadState {
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';
  mediaId: string | null;
  error: string | null;
}

/**
 * Direct-to-storage upload. The file never touches our API — the server only
 * mints a short-lived target and records the row.
 *
 * Progress is reported because on a Pakistani mobile connection a 60MB video
 * can take minutes, and a spinner with no number is indistinguishable from a
 * hang. An agent who thinks the app froze will kill it and lose the upload.
 */
export function useUpload() {
  const [state, setState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
    mediaId: null,
    error: null,
  });

  const upload = useCallback(
    async (propertyId: string, file: { uri: string; type: string; size: number }) => {
      const kind = file.type.startsWith('video/') ? MediaKind.VIDEO : MediaKind.IMAGE;
      setState({ progress: 0, status: 'uploading', mediaId: null, error: null });

      try {
        const target = await api<UploadTarget>('/media/upload-url', {
          method: 'POST',
          body: { propertyId, kind, contentType: file.type, byteSize: file.size },
        });

        await uploadWithProgress(target, file, (progress) =>
          setState((s) => ({ ...s, progress })),
        );

        if (kind === MediaKind.VIDEO) {
          // Cloudflare transcodes asynchronously and calls our webhook. The
          // agent can carry on with the wizard meanwhile — blocking the whole
          // flow on a transcode would make posting a listing feel endless.
          setState({ progress: 1, status: 'processing', mediaId: target.mediaId, error: null });
          return target.mediaId;
        }

        await api(`/media/${target.mediaId}/confirm`, { method: 'POST' });
        setState({ progress: 1, status: 'ready', mediaId: target.mediaId, error: null });
        return target.mediaId;
      } catch (error) {
        setState({
          progress: 0,
          status: 'failed',
          mediaId: null,
          error: error instanceof Error ? error.message : 'upload_failed',
        });
        return null;
      }
    },
    [],
  );

  return { ...state, upload };
}

/**
 * XMLHttpRequest rather than fetch: React Native's fetch gives no upload
 * progress events, and progress is the difference between "working" and
 * "frozen" on a slow connection.
 */
function uploadWithProgress(
  target: UploadTarget,
  file: { uri: string; type: string },
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(target.method, target.url);

    for (const [key, value] of Object.entries(target.headers)) {
      request.setRequestHeader(key, value);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };

    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`upload_failed_${request.status}`));

    request.onerror = () => reject(new Error('upload_network_error'));
    request.ontimeout = () => reject(new Error('upload_timeout'));

    // Cloudflare Stream wants multipart; R2 wants the raw body.
    if (target.method === 'POST') {
      const form = new FormData();
      form.append('file', { uri: file.uri, type: file.type, name: 'video.mp4' } as never);
      request.send(form);
    } else {
      request.send({ uri: file.uri, type: file.type, name: 'image' } as never);
    }
  });
}
