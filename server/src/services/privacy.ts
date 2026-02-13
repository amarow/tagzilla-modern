import { privacyRepository } from '../db/repository';

export const privacyService = {
  async redactText(text: string, profileId: number): Promise<string> {
    const rules = await privacyRepository.getRules(profileId);
    let redactedText = text;

    for (const rule of rules as any[]) {
      if (!rule.isActive) continue;

      try {
        if (rule.type === 'REGEX') {
          const regex = new RegExp(rule.pattern, 'gi');
          redactedText = redactedText.replace(regex, rule.replacement);
        } else {
          // Literal replacement
          // Escape special characters for literal search in case someone puts something weird
          const escapedPattern = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedPattern, 'gi');
          redactedText = redactedText.replace(regex, rule.replacement);
        }
      } catch (e) {
        console.error(`[Privacy] Error applying rule ${rule.id}:`, e);
      }
    }

    return redactedText;
  }
};
