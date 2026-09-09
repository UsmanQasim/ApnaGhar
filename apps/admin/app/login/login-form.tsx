'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { AdminStrings } from '../../src/strings';
import { fieldStyle, primaryButtonStyle } from '../../src/ui';
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
    <div className="card grid w-full max-w-[400px] gap-sm p-lg">
      <h1 className="m-0 text-2xl font-semibold tracking-tight">{S.title}</h1>

      {expired ? (
        <div className="rounded-md bg-secondary-container px-sm py-2 text-sm text-on-secondary-container">
          {S.sessionExpired}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md bg-error-container px-sm py-2 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      {step === 'phone' ? (
        <form onSubmit={onRequest} className="grid gap-xs">
          <label htmlFor="phone" className="text-sm text-on-surface-variant">
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
            className={`${fieldStyle} numeric text-lg`}
          />
          <button type="submit" disabled={working} className={`${primaryButtonStyle} mt-1`}>
            {working ? S.sending : S.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="grid gap-xs">
          <label htmlFor="code" className="text-sm text-on-surface-variant">
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
            className={`${fieldStyle} numeric text-center text-xl tracking-[0.4em]`}
          />

          {devCode ? (
            <p className="m-0 rounded-md bg-primary-fixed px-sm py-2 text-sm text-on-primary-fixed">
              {S.devCode}{' '}
              <strong className="numeric inline-block font-semibold">{devCode}</strong>
            </p>
          ) : null}

          <button type="submit" disabled={working} className={`${primaryButtonStyle} mt-1`}>
            {working ? S.verifying : S.submit}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
            className="touch cursor-pointer border-0 bg-transparent text-sm text-primary hover:underline"
          >
            {S.changeNumber}
          </button>
        </form>
      )}
    </div>
  );
}
