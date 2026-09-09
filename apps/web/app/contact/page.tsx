import { C, copyFor, type WebCopy } from '../../src/copy';
import { getLocale } from '../../src/locale';
import { Section } from '../../src/components/chrome';
import { MailIcon, PhoneIcon, PinIcon } from '../../src/components/icons';
import { ContactForm } from './contact-form';

// Module scope: metadata is generated per build, not per request, so it
// cannot read the locale cookie. `C` is the default (Urdu) set.
export const metadata = { title: `${C.nav.contact} — ${C.brand}` };

/** Per request: these questions are locale-dependent. */
function faqFor(C: WebCopy) {
  return [
    { q: C.contact.faq1Q, a: C.contact.faq1A },
    { q: C.contact.faq2Q, a: C.contact.faq2A },
    { q: C.contact.faq3Q, a: C.contact.faq3A },
  ] as const;
}

export default async function ContactPage() {
  // Per request, not module scope: the visitor's language is a cookie.
  const C = copyFor(await getLocale());
  const FAQ = faqFor(C);

  return (
    <main className="flex-1">
      <Section title={C.contact.title} subtitle={C.contact.subtitle} tone="ambient">
        <div className="grid gap-md lg:grid-cols-[1.3fr_1fr]">
          <div className="card p-lg">
            <h2 className="m-0 mb-sm text-[22px] font-bold tracking-tight">
              {C.contact.sendMessage}
            </h2>
            <ContactForm strings={C.contact} />
          </div>

          <div className="grid content-start gap-md">
            <div className="card p-md">
              <h3 className="m-0 flex items-center gap-xs text-[19px] font-semibold">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-fixed text-on-primary-fixed">
                  <PinIcon size={18} />
                </span>
                {C.contact.headOffice}
              </h3>
              <p className="mt-xs mb-0 text-[15px] text-on-surface-variant">{C.contact.address}</p>
            </div>

            <div className="card p-md">
              <h3 className="m-0 flex items-center gap-xs text-[19px] font-semibold">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-fixed text-on-primary-fixed">
                  <PhoneIcon size={18} />
                </span>
                {C.contact.phoneAndEmail}
              </h3>

              {/* Both render LTR: a mirrored phone number is a wrong number. */}
              <ul className="mt-xs grid list-none gap-2 p-0 text-[15px]">
                <li className="flex items-center gap-xs">
                  <span className="shrink-0 text-on-surface-variant">
                    <PhoneIcon size={16} />
                  </span>
                  <a href="tel:+923095307723" className="numeric text-on-surface no-underline hover:underline">
                    +92 309 5307723
                  </a>
                </li>
                <li className="flex items-center gap-xs">
                  <span className="shrink-0 text-on-surface-variant">
                    <MailIcon size={16} />
                  </span>
                  <a
                    href="mailto:1998Usman@gmail.com"
                    className="latin min-w-0 truncate text-on-surface no-underline hover:underline"
                  >
                    1998Usman@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────────────────────
          Native <details>, so it opens without JavaScript. */}
      <Section title={C.contact.faqTitle} tone="raised">
        <div className="mx-auto grid max-w-[780px] gap-xs">
          {FAQ.map((item) => (
            <details key={item.q} className="card group px-md py-1">
              <summary className="touch flex cursor-pointer list-none items-center gap-sm text-[17px] font-medium marker:hidden">
                {/* A drawn chevron: the native marker sits on the wrong side
                    in RTL and cannot be moved. */}
                <span className="text-on-surface-variant transition-transform duration-200 group-open:rotate-90 rtl:group-open:-rotate-90">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="rtl:-scale-x-100"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">{item.q}</span>
              </summary>
              <p className="mt-1 mb-sm ms-[calc(16px+var(--ghar-space-sm))] text-[15px] text-on-surface-variant">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Section>
    </main>
  );
}
