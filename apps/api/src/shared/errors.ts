import type { FastifyError, FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { Prisma } from '../generated/prisma/client'

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

export const badRequest = (code: string, message: string) => new AppError(400, code, message)
export const unauthorized = (message = 'Não autenticado') =>
  new AppError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = 'Sem permissão para esta ação') =>
  new AppError(403, 'FORBIDDEN', message)
export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} não encontrado`)
export const conflict = (code: string, message: string) => new AppError(409, code, message)

/** Handler central: formato único `{ error: { code, message, details? } }` e nunca vaza stack trace. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada' } })
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      })
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.validation.map((issue) => ({
            path: issue.instancePath.replace(/^\//, '').replaceAll('/', '.'),
            message: issue.message,
          })),
        },
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Não encontrado' } })
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
        },
      })
    }

    // Erros do próprio Fastify/plugins (multipart, JSON malformado...)
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: { code: error.code ?? 'BAD_REQUEST', message: error.message },
      })
    }

    request.log.error({ err: error }, 'erro não tratado')
    return reply
      .status(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente.' } })
  })
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
