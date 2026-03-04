// Stub for pino — WalletConnect imports pino which uses dynamic worker
// files that Turbopack can't resolve at SSR time. Since pino logging is
// only relevant client-side (browser console), we provide a no-op stub.

const noop = () => {};
const noopLogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
  level: 'silent',
  silent: noop,
  isLevelEnabled: () => false,
  bindings: () => ({}),
  flush: noop,
  on: noop,
  addLevel: noop,
  levelVal: 0,
  [Symbol.for('pino.serializers')]: {},
  [Symbol.for('pino.metadata')]: true,
};

function pino() {
  return noopLogger;
}

pino.destination = () => ({ write: noop, end: noop, flushSync: noop, [Symbol.for('pino.metadata')]: true });
pino.transport = () => noopLogger;
pino.multistream = () => ({ write: noop, end: noop, flushSync: noop });
pino.levels = { values: { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }, labels: {} };
pino.stdSerializers = { req: noop, res: noop, err: noop, wrapRequestSerializer: noop, wrapResponseSerializer: noop, wrapErrorSerializer: noop };
pino.stdTimeFunctions = { epochTime: noop, unixTime: noop, nullTime: noop, isoTime: noop };
pino.symbols = {};
pino.version = '0.0.0';

module.exports = pino;
module.exports.default = pino;
module.exports.pino = pino;
