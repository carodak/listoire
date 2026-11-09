export function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
