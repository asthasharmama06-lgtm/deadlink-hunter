const URL_RE = /^https?:\/\/(localhost|([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})(:\d{2,5})?(\/[^\s]*)?$/i;

export const isValidUrl = (value: string): boolean => URL_RE.test(value.trim());

export function validateUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter a website address to scan.';
  if (!/^https?:\/\//i.test(v)) return 'Start the address with http:// or https://';
  if (!isValidUrl(v)) return 'That doesn’t look like a valid address, e.g. https://example.com';
  return null;
}

export const findUrl = (text: string): string | null => text.match(/https?:\/\/[^\s]+/i)?.[0] ?? null;
