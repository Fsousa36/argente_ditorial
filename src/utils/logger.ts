import { Logger, LogLevel } from '../types.js';

const colors: Record<LogLevel, string> = {
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[90m',   // gray
};

const reset = '\x1b[0m';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function createLogger(name: string): Logger {
  function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const color = colors[level];
    const ts = formatTimestamp();
    const prefix = `${color}[${ts}] [${level.toUpperCase()}] [${name}]${reset}`;
    const line = `${prefix} ${message}`;

    switch (level) {
      case 'error':
        console.error(line);
        if (data) console.error(data);
        break;
      case 'warn':
        console.warn(line);
        if (data) console.warn(data);
        break;
      default:
        console.log(line);
        if (data) console.log(data);
    }
  }

  return {
    info: (msg, data?) => log('info', msg, data),
    warn: (msg, data?) => log('warn', msg, data),
    error: (msg, data?) => log('error', msg, data),
    debug: (msg, data?) => log('debug', msg, data),
  };
}

export const logger = createLogger('AgenteEditorial');

export function createScopedLogger(scope: string): Logger {
  return createLogger(scope);
}
