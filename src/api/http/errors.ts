import axios, { type AxiosError } from 'axios'

export type ApiErrorPayload = {
  message?: string
  code?: string
}

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string
  readonly fieldErrors?: Record<string, string>

  constructor(
    message: string,
    options?: {
      status?: number
      code?: string
      fieldErrors?: Record<string, string>
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options?.status
    this.code = options?.code
    this.fieldErrors = options?.fieldErrors
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return fromAxiosError(error)
  }

  if (error instanceof Error) {
    return new ApiError(error.message)
  }

  return new ApiError('Erro inesperado ao comunicar com a API.')
}

function fromAxiosError(error: AxiosError<ApiErrorPayload>) {
  if (error.code === 'ERR_CANCELED') {
    return new ApiError('Requisicao cancelada.', { code: error.code })
  }

  const status = error.response?.status
  const payload = error.response?.data
  const message =
    payload?.message ??
    error.message ??
    'Nao foi possivel completar a requisicao.'

  return new ApiError(message, {
    status,
    code: payload?.code ?? error.code,
    fieldErrors:
      payload && 'fieldErrors' in payload
        ? (payload.fieldErrors as Record<string, string>)
        : undefined,
  })
}
