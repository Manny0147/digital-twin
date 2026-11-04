const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s*:\s*/i,
  /you\s+are\s+now\s+/i,
  /<script[\s>]/i,
  /javascript:/i,
];

export function sanitizeMemoryContent(input: string): string {
  let out = input.trim();
  for (const pattern of INJECTION_PATTERNS) {
    out = out.replace(pattern, "[filtered]");
  }
  return out.slice(0, 10000);
}

export function sanitizeChatInput(input: string): string {
  return sanitizeMemoryContent(input).slice(0, 4000);
}
