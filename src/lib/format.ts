/**
 * Formatting utilities for مزبحة القلعة
 * Rule: Western digits (0-9) everywhere. Money integer EGP e.g. "180 ج.م".
 */

export function formatPrice(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded} ج.م`;
}

export function formatOrderNumber(orderNum: number | string): string {
  return `#${orderNum}`;
}

export function formatTime(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDate(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}
