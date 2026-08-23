/**
 * Vercel function entry point.
 *
 * Plain JavaScript, and it requires the *compiled* output in dist/ rather than
 * importing TypeScript directly. That is deliberate and load-bearing: Vercel
 * compiles files in this directory with esbuild, and esbuild does not support
 * `emitDecoratorMetadata`. NestJS dependency injection is built entirely on
 * that metadata, so a TypeScript entry point here would build cleanly and then
 * fail at runtime with "Nest can't resolve dependencies".
 *
 * Routing `tsc` (via `nest build`) over the whole app first, and having this
 * file only require the result, keeps the metadata intact.
 */
const { createApp } = require('../dist/serverless');

let appPromise;

module.exports = async (req, res) => {
  // Cache the promise, not the resolved app: two requests arriving during a
  // cold start would otherwise both trigger a full Nest bootstrap.
  appPromise = appPromise || createApp();
  const app = await appPromise;
  return app(req, res);
};
