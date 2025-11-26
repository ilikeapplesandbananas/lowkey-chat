/**
 * Safety filter service for content moderation
 * Detects potentially unsafe or illegal requests and offers alternatives
 */

const UNSAFE_PATTERNS = {
  hacking: /(?:hack|crack|exploit|malware|virus|ddos|bypass|brute.?force)/i,
  illegal: /(?:illegal|murder|bomb|drug.?deal|money.?launder|fraud|steal|rob)/i,
  violence: /(?:how.?to.?kill|how.?to.?hurt|how.?to.?injure|torture|assault|weapon)/i,
  abuse: /(?:abuse|harassment|discriminat|racist|sexist)/i,
};

const SAFER_ALTERNATIVES: Record<string, string> = {
  hacking:
    "I can't help with hacking or unauthorized access. Instead, I can help you with: cybersecurity best practices, ethical hacking certifications, or authorized penetration testing.",
  illegal:
    "I can't assist with illegal activities. I can help you with: legal compliance, understanding regulations, or legitimate business practices.",
  violence:
    "I can't provide guidance on causing harm. I can help with: conflict resolution, self-defense education, or crisis resources.",
  abuse:
    "I can't support harmful behavior. I can help you with: healthy communication, diversity and inclusion resources, or support services.",
};

export interface SafetyCheckResult {
  isSafe: boolean;
  category?: string;
  message: string;
  suggestion?: string;
}

export const safetyService = {
  checkContent(content: string): SafetyCheckResult {
    for (const [category, pattern] of Object.entries(UNSAFE_PATTERNS)) {
      if (pattern.test(content)) {
        return {
          isSafe: false,
          category,
          message: `I can't help with that request.`,
          suggestion: SAFER_ALTERNATIVES[category],
        };
      }
    }

    return {
      isSafe: true,
      message: "Content is safe to process",
    };
  },

  isMemorySensitive(key: string, value: string): boolean {
    const sensitiveKeywords =
      /(?:password|api.?key|secret|token|credential|ssn|social.?security|credit.?card|bank|account|personal)/i;
    return sensitiveKeywords.test(key) || sensitiveKeywords.test(value);
  },
};
