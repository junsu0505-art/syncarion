export const SITE_TITLE = 'Syncarion';
export const SITE_DESCRIPTION = 'AI로 사업의 핵심을 재설계합니다. 진단부터 구축, 운영까지.';
export const SITE_URL = 'https://syncarion.com';
export const SITE_AUTHOR = 'Tom';

export const CATEGORIES = {
  investing: { label: '투자', description: '시장 분석과 투자 인사이트' },
  building: { label: '개발', description: '도구를 만들면서 배운 것' },
  'workshop-log': { label: '작업실 일지', description: '빌더의 주간 회고와 일기' },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;
