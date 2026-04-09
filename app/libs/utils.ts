export function generateCodigo(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += Math.floor(Math.random() * 900 + 100);
  return result;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}