import axios from 'axios'

import { normalizeApiError } from './errors'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
)
