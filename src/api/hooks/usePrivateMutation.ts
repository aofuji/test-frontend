import { useMutation, useQueryClient, type DefaultError, type UseMutationOptions } from '@tanstack/react-query'

import { capturePrivateSession } from '../privateSession'

// Mutation options can change while a request is pending. Keep the originating
// session in onMutate's context, independently of the observer's latest options.
export function usePrivateMutation<TData = unknown, TError = DefaultError, TVariables = void, TResult = undefined>(
  options: UseMutationOptions<TData, TError, TVariables, TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    ...options,
    onMutate: async (variables, context) => {
      const session = capturePrivateSession(queryClient)
      const result = await options.onMutate?.(variables, context)
      return { session, result }
    },
    onSuccess: (data, variables, operation, context) => {
      if (operation.session.isCurrent()) return options.onSuccess?.(data, variables, operation.result as TResult, context)
    },
    onError: (error, variables, operation, context) => {
      if (operation?.session.isCurrent()) return options.onError?.(error, variables, operation.result, context)
    },
    onSettled: (data, error, variables, operation, context) => {
      if (operation?.session.isCurrent()) return options.onSettled?.(data, error, variables, operation.result, context)
    },
  })
}
