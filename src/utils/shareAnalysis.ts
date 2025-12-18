export function generateShareLink(analysis: any): string {
  if (!analysis) return '';

  const encoded = btoa(
    encodeURIComponent(JSON.stringify(analysis))
  );

  return `${window.location.origin}?share=${encoded}`;
}

export function decodeShareLink(param: string): any | null {
  try {
    return JSON.parse(
      decodeURIComponent(atob(param))
    );
  } catch {
    return null;
  }
}
