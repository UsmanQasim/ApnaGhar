import { PrismaClient } from '@prisma/client';

/**
 * Removes everything `prisma/seed-demo.ts` wrote — and nothing else.
 *
 *     pnpm --filter @ghar/api demo:clean
 *     pnpm --filter @ghar/api demo:clean -- --dry-run
 *
 * ── Why this is safe ────────────────────────────────────────────────────────
 *
 * The demo seed tags every row it creates, so removal is an exact match rather
 * than a guess:
 *
 *   • its users all live in the reserved +92 300 9900 0xx phone block
 *   • its invoices all carry a DEMO- number prefix
 *
 * Deleting those users is enough. Agent, Subscription, Property, Invoice,
 * InvoiceItem, Payment, LedgerEntry, Lead, PropertyView, ShareLink and
 * Notification all cascade from User (or from Agent, which is itself keyed on
 * the user id), so a single delete takes the whole tree with it and cannot
 * leave an orphan behind.
 *
 * Three columns point at users *without* a cascade — `Payment.verifiedById`,
 * `Lead.customerId`, `PropertyView.viewerId`. Prisma nulls those instead, which
 * is the correct behaviour but would silently edit a real row if a demo user
 * had ever verified a real payment. The seed only ever creates agents, never
 * admins, so this cannot happen; the check below proves it rather than assuming
 * it, and refuses to run if the assumption ever stops holding.
 *
 * Running this twice is fine. Running it on a database that was never seeded is
 * fine. It never touches plans, localities, the ordinary `seed.ts` demo agent
 * (+92 300 1234567) or the admin (+92 300 9999999).
 */

const prisma = new PrismaClient();

/** Must stay identical to the same constants in seed-demo.ts. */
const DEMO_PHONE_PREFIX = '+9230099000';
const DEMO_INVOICE_PREFIX = 'DEMO-';

const dryRun = process.argv.includes('--dry-run') || process.env['DEMO_CLEAN_DRY_RUN'] === '1';

async function main(): Promise<void> {
  // The same guard the seed uses. Cleanup is less destructive than seeding, but
  // "less destructive" is not "safe to run against production by accident".
  if (process.env['NODE_ENV'] === 'production' && !process.env['DEMO_SEED_ALLOW_PRODUCTION']) {
    throw new Error(
      'Refusing to delete demo data with NODE_ENV=production.\n' +
        'If this really is intended, set DEMO_SEED_ALLOW_PRODUCTION=1.',
    );
  }

  const users = await prisma.user.findMany({
    where: { phone: { startsWith: DEMO_PHONE_PREFIX } },
    select: { id: true, phone: true, name: true, role: true },
    orderBy: { phone: 'asc' },
  });

  if (users.length === 0) {
    console.log('Nothing to remove — no users in the demo phone block.');

    // A DEMO- invoice with no demo user behind it would mean the tagging drifted
    // between the two scripts. Worth saying out loud rather than exiting clean.
    const orphans = await prisma.invoice.count({
      where: { number: { startsWith: DEMO_INVOICE_PREFIX } },
    });
    if (orphans > 0) {
      console.warn(
        `\n⚠ ${orphans} invoice(s) still carry the ${DEMO_INVOICE_PREFIX} prefix but belong to ` +
          'agents outside the demo phone block. Left alone — inspect them by hand.',
      );
    }
    return;
  }

  // The assumption the cascade analysis rests on. If a demo user somehow became
  // an admin, deleting them would null out `verifiedById` on payments they had
  // verified — possibly real ones.
  const admins = users.filter((user) => user.role === 'admin');
  if (admins.length > 0) {
    throw new Error(
      `Refusing to delete: ${admins.map((a) => a.phone).join(', ')} ` +
        'in the demo phone block have the admin role. Demo users are only ever agents, ' +
        'so something has edited them. Check what they have verified before removing them.',
    );
  }

  const ids = users.map((user) => user.id);

  // Counted before the delete, both so the summary is truthful and so a
  // --dry-run can report exactly what a real run would take with it.
  const [properties, invoices, payments, leads, views, sessions] = await Promise.all([
    prisma.property.count({ where: { agentId: { in: ids } } }),
    prisma.invoice.count({ where: { agentId: { in: ids } } }),
    prisma.payment.count({ where: { agentId: { in: ids } } }),
    prisma.lead.count({ where: { agentId: { in: ids } } }),
    prisma.propertyView.count({ where: { property: { agentId: { in: ids } } } }),
    prisma.session.count({ where: { userId: { in: ids } } }),
  ]);

  console.log(`${dryRun ? 'Would remove' : 'Removing'} ${users.length} demo agent(s):\n`);
  for (const user of users) {
    console.log(`  ${user.phone}  ${user.name ?? '—'}`);
  }

  console.log('\nand everything cascading from them:\n');
  console.log(`  ${String(properties).padStart(4)} listings`);
  console.log(`  ${String(invoices).padStart(4)} invoices`);
  console.log(`  ${String(payments).padStart(4)} payments`);
  console.log(`  ${String(leads).padStart(4)} leads`);
  console.log(`  ${String(views).padStart(4)} property views`);
  console.log(`  ${String(sessions).padStart(4)} sessions`);

  if (dryRun) {
    console.log('\n--dry-run: nothing was deleted.');
    return;
  }

  const { count } = await prisma.user.deleteMany({ where: { id: { in: ids } } });

  // Prove the cascade actually fired rather than trusting the schema comment.
  const remaining = await prisma.invoice.count({
    where: { number: { startsWith: DEMO_INVOICE_PREFIX } },
  });

  console.log(`\n✓ ${count} demo user(s) deleted.`);
  if (remaining > 0) {
    console.warn(
      `⚠ ${remaining} ${DEMO_INVOICE_PREFIX} invoice(s) survived — they belong to an agent ` +
        'outside the demo phone block. Inspect them by hand.',
    );
  } else {
    console.log('✓ no demo rows left behind.');
  }
  console.log('\nPlans, localities, the seed.ts demo agent and the admin were not touched.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
