'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { requestOtp, verifyOtp } from '../../src/session';

/**
 * Two-step phone + OTP sign-in.
 *
 * Deliberately NOT using useActionState / useFormState: this app is on React
 * 18.3, where useActionState does not exist and useFormState is still
 * experimental. Server actions imported and awaited inside an event handler
 * work on both 18 and 19, so this survives the eventual React upgrade.
 */

const ERRORS: Record<string, string> = {
  api_unreachable: 'سرور سے رابطہ نہیں ہو سکا۔ ہو سکتا ہے API ابھی بند ہو۔',
  invalid_pk_mobile_number: 'موبائل نمبر درست نہیں۔ مثال: 03009999999',
  otp_cooldown: 'نیا کوڈ بھیجنے کے لیے تھوڑا انتظار کریں۔',
  otp_invalid: 'کوڈ درست نہیں یا اس کی مدت ختم ہو چکی ہے۔',
  otp_request_failed: 'کوڈ نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔',
  not_admin: 'یہ اکاؤنٹ ایڈمن نہیں ہے۔',
};

export function LoginForm({ expired }: { expired: boolean }) {
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

  return (
    <div dir="rtl" style={wrap}>
      <h1 style={heading}>ایڈمن لاگ اِن</h1>

      {expired ? (
        <div style={notice}>آپ کا سیشن ختم ہو گیا۔ دوبارہ لاگ اِن کریں۔</div>
      ) : null}

      {error ? <div style={warning}>{error}</div> : null}

      {step === 'phone' ? (
        <form onSubmit={onRequest} style={form}>
          <label htmlFor="phone" style={label}>
            موبائل نمبر
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
            {working ? 'بھیجا جا رہا ہے…' : 'کوڈ بھیجیں'}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} style={form}>
          <label htmlFor="code" style={label}>
            چھ ہندسوں کا کوڈ
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
              ڈیو موڈ کوڈ: <strong style={{ direction: 'ltr', display: 'inline-block' }}>{devCode}</strong>
            </p>
          ) : null}

          <button type="submit" disabled={working} style={button}>
            {working ? 'تصدیق ہو رہی ہے…' : 'لاگ اِن'}
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
            نمبر تبدیل کریں
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
