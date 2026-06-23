export function formatMatchBookingCode(matchId: string): string {
  let hash = 0;
  for (let i = 0; i < matchId.length; i++) {
    hash = (hash << 5) - hash + matchId.charCodeAt(i);
    hash |= 0;
  }
  return `SB${String(Math.abs(hash) % 1000000).padStart(6, '0')}`;
}

export function generateSlipBookingCode(): string {
  return `SB${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
