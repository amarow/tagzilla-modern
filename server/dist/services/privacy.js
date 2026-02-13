"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyService = void 0;
const repository_1 = require("../db/repository");
exports.privacyService = {
    async redactText(text, profileId) {
        const rules = await repository_1.privacyRepository.getRules(profileId);
        let redactedText = text;
        for (const rule of rules) {
            if (!rule.isActive)
                continue;
            try {
                if (rule.type === 'REGEX') {
                    const regex = new RegExp(rule.pattern, 'gi');
                    redactedText = redactedText.replace(regex, rule.replacement);
                }
                else {
                    // Literal replacement
                    // Escape special characters for literal search in case someone puts something weird
                    const escapedPattern = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(escapedPattern, 'gi');
                    redactedText = redactedText.replace(regex, rule.replacement);
                }
            }
            catch (e) {
                console.error(`[Privacy] Error applying rule ${rule.id}:`, e);
            }
        }
        return redactedText;
    }
};
