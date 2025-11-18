/**
 * Development-only Logger Utility
 *
 * Provides conditional logging that only works in development mode.
 * In production builds, all log statements are no-ops.
 *
 * Usage:
 * import { logger } from '@/lib/logger'
 *
 * logger.debug('Debug info', { data })
 * logger.info('Info message')
 * logger.warn('Warning message')
 * logger.error('Error message', error)
 */

const isDevelopment = import.meta.env.DEV

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  context?: string
  timestamp?: boolean
}

class Logger {
  private context: string

  constructor(context: string = 'App') {
    this.context = context
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString()
    const ctx = context || this.context
    return `[${timestamp}] [${level.toUpperCase()}] [${ctx}] ${message}`
  }

  private log(level: LogLevel, message: string, data?: unknown, options?: LoggerOptions): void {
    if (!isDevelopment) return

    const ctx = options?.context || this.context
    const formattedMessage = this.formatMessage(level, message, ctx)

    switch (level) {
      case 'debug':
        if (data) {
          console.log(formattedMessage, data)
        } else {
          console.log(formattedMessage)
        }
        break
      case 'info':
        if (data) {
          console.info(formattedMessage, data)
        } else {
          console.info(formattedMessage)
        }
        break
      case 'warn':
        if (data) {
          console.warn(formattedMessage, data)
        } else {
          console.warn(formattedMessage)
        }
        break
      case 'error':
        if (data) {
          console.error(formattedMessage, data)
        } else {
          console.error(formattedMessage)
        }
        break
    }
  }

  debug(message: string, data?: unknown, options?: LoggerOptions): void {
    this.log('debug', message, data, options)
  }

  info(message: string, data?: unknown, options?: LoggerOptions): void {
    this.log('info', message, data, options)
  }

  warn(message: string, data?: unknown, options?: LoggerOptions): void {
    this.log('warn', message, data, options)
  }

  error(message: string, data?: unknown, options?: LoggerOptions): void {
    this.log('error', message, data, options)
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): Logger {
    return new Logger(context)
  }
}

// Export singleton instance
export const logger = new Logger('App')

// Export factory for creating context-specific loggers
export const createLogger = (context: string): Logger => new Logger(context)
