'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { colors, radius, roles, spacing } from '@ghar/ui';

import type { AdminStrings } from '../../src/strings';
import { requestOtp, verifyOtp } from '../../src/session';

type LoginStrings = AdminStrings['login'];

/**
 * Two-step phone + OTP sign-in.
 *
 * Deliberately NOT using useActionState / useFormState: this app is on React
 * 18.3, where useActionState does not exist and useFormState is still
 * experimental. Server actions imported and awaited inside an event handler
 * work on both 18 and 19, so this survives the eventual React upgrade.
 */

export function LoginForm({
  expired,
  strings: S,
}: {
  expired: boolean;
  /**
   * Passed down: this is a client component, and the sign-in screen is the one
   * place an operator cannot navigate away from to change the language — so
   * getting it in their own language matters more here than anywhere else.
   */
  strings: LoginStrings;
}) {
  const ERRORS: Record<string, string> = S.errors;

  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRequest(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await requestOtp(phone);
    setBusy(false);

    if (!result.ok) {
      setError(ERRORS[result.code ?? ''] ?? ERRORS['otp_request_failed']!);
      return;
    }

    setDevCode(result.devCode ?? null);
    setStep('code');
  }

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await verifyOtp(phone, code);
    setBusy(false);

    if (!result.ok) {
      setError(ERRORS[result.code ?? ''] ?? ERRORS['otp_invalid']!);
      return;
    }

    // refresh() re-runs the server components so the layout picks up the new
    // cookie and renders the sidebar; replace() then moves off /login.
    startTransition(() => {
      router.replace('/');
      router.refresh();
    });
  }

  const working = busy || pending;

  // No `dir` here: the <html> element carries it, per locale. Hardcoding rtl
  // put a Roman Urdu form into a mirrored layout.
  return (
    <div style={wrap}>
      <h1 style={heading}>{S.title}</h1>

      {expired ? <div style={notice}>{S.sessionExpired}</div> : null}

      {error ? <div style={warning}>{error}</div> : null}

      {step === 'phone' ? (
        <form onSubmit={onRequest} style={form}>
          <label htmlFor="phone" style={label}>
            {S.phoneLabel}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="numeric"
            placeholder="03009999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={input}
          />
          <button type="submit" disabled={working} style={button}>
            {working ? S.sending : S.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} style={form}>
          <label htmlFor="code" style={label}>
            {S.codeLabel}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ ...input, letterSpacing: 6, textAlign: 'center' }}
          />

          {devCode ? (
            <p style={hint}>
              {S.devCode}{' '}
              <strong style={{ direction: 'ltr', display: 'inline-block' }}>{devCode}</strong>
            </p>
          ) : null}

          <button type="submit" disabled={working} style={button}>
            {working ? S.verifying : S.submit}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
            style={linkButton}
          >
            {S.changeNumber}
          </button>
        </form>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 380,
  margin: '10vh auto',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
  background: roles.cardBackground,
  border: `1px solid ${roles.cardBorder}`,
  borderRadius: radius.lg,
  padding: spacing.lg,
};

const heading: React.CSSProperties = { fontSize: 22, lineHeight: 2, margin: 0 };

const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: spacing.xs };

const label: React.CSSProperties = { fontSize: 15, color: colors.onSurfaceVariant };

const input: React.CSSProperties = {
  minHeight: spacing.touchTarget,
  padding: `0 ${spacing.sm}px`,
  border: `1px solid ${colors.outline}`,
  borderRadius: radius.md,
  fontSize: 18,
  // Latin digits in an RTL page: force LTR or the number renders reversed.
  direction: 'ltr',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

const button: React.CSSProperties = {
  minHeight: spacing.touchTarget,
  background: colors.primary,
  color: colors.onPrimary,
  border: 'none',
  borderRadius: radius.md,
  fontFamily: 'inherit',
  fontSize: 16,
  cursor: 'pointer',
  marginTop: spacing.base,
};

const linkButton: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.primary,
  fontFamily: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
  minHeight: spacing.touchTarget,
};

const warning: React.CSSProperties = {
  background: roles.warningBackground,
  color: roles.warningText,
  padding: spacing.sm,
  borderRadius: radius.md,
  fontSize: 15,
  lineHeight: 2,
};

const notice: React.CSSProperties = {
  background: colors.surfaceContainer,
  color: colors.onSurface,
  padding: spacing.sm,
  borderRadius: radius.md,
  fontSize: 15,
  lineHeight: 2,
};

const hint: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: colors.onSurfaceVariant,
};
