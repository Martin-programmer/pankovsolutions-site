// JSON-LD в <script>: „<“ от съдържанието (напр. „</script>“ в описание) би затворил тага.
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
