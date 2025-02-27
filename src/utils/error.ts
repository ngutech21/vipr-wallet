export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error) // Converts any value to string safely
}
