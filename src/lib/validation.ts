export function validateRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function validateMessageLength(message: string, max = 200): boolean {
  return message.trim().length > 0 && message.trim().length <= max;
}
