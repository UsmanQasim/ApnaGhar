import { LanguageSwitcher } from '../src/LanguageSwitcher';
import { copyFor } from '../src/copy';
import { getLocale } from '../src/locale';

/**
 * 404 for the share host — e.g. a truncated link, or a path that is not /s/….
 *
 * Deliberately says nothing about whether a token exists. "Not found" and
 * "revoked" must look identical from outside, or the 404 becomes an oracle for
 * guessing valid tokens — which is why this screen is visually the same as the
 * expired state on /s/[token].
 */
export default async function NotFound() {
  const locale = await getLocale();
  const C = copyFor(locale);

  return (
    <main className="mx-auto grid max-w-[460px] justify-items-center gap-sm px-md py-[16vh] text-center">
      <span className="grid size-14 place-items-center rounded-full bg-warning-background text-warning-text">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3.5 2.5 20h19L12 3.5Z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
      </span>

      <h1 className="m-0 text-[22px] font-bold tracking-tight text-on-surface">
        {C.notFound.title}
      </h1>

      <p className="m-0 rounded-md bg-warning-background px-sm py-2 text-[15px] text-warning-text">
        {C.notFound.warning}
      </p>

      <p className="m-0 text-[15px] text-on-surface-variant">{C.notFound.hint}</p>

      {/* Offered even here: someone who cannot read the error is exactly the
          person who needs the switcher most. */}
      <div className="mt-md">
        <LanguageSwitcher active={locale} label={C.language} />
      </div>
    </main>
  );
}
