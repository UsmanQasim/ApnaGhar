/**
 * The session cookie's name, in its own module on purpose.
 *
 * It cannot live in `session.ts`: that file is marked `'use server'`, and Next
 * only permits async function exports from a server-actions module — exporting
 * a plain string from it fails the build with "Only async functions are allowed
 * to be exported in a 'use server' file".
 *
 * Middleware also needs this name, and middleware runs in the edge runtime
 * where importing a server-actions module is not an option either.
 */
export const SESSION_COOKIE = 'ghar_admin';
