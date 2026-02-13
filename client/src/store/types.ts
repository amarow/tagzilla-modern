export interface FileHandle {
  id: number;
  scopeId: number;
  path: string;
  name: string;
  extension: string;
  size: number;
  mimeType: string | null;
  updatedAt: string;
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  isEditable?: boolean;
  _count?: {
    files: number;
  };
}

export interface Scope {
  id: number;
  path: string;
  name: string;
}

export interface User {
  id: number;
  username: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key?: string;
  permissions: string[];
  privacyProfileId: number | null;
  privacyProfileName?: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface PrivacyProfile {
  id: number;
  name: string;
  ruleCount: number;
}

export interface PrivacyRule {
  id: number;
  profileId: number;
  type: 'LITERAL' | 'REGEX';
  pattern: string;
  replacement: string;
  isActive: boolean;
}

export interface SearchCriteria {
  filename: string;
  content: string;
  directory: string;
}
