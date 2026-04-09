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

export type ProductStatus = 'development' | 'beta' | 'live';

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: ProductStatus;
  category: 'investing' | 'building';
  url?: string;
  features: string[];
}

export const PRODUCTS: Product[] = [
  {
    slug: 'syncarion',
    name: 'Syncarion',
    tagline: 'AI 사업 설계 & 구축 파트너',
    description: '사업 진단부터 AI 시스템 구축, 운영까지. 바이브코딩 기반의 풀스택 솔루션으로 사업의 핵심을 재설계합니다.',
    status: 'live',
    category: 'building',
    url: 'https://syncarion.com',
    features: [
      'AI 사업 진단 & 로드맵 설계',
      '맞춤형 AI 파이프라인 구축',
      '운영 유지보수 & 지속 확장',
      'Anthropic 파트너 기술력',
    ],
  },
  {
    slug: 'decisionlab',
    name: 'DecisionLab',
    tagline: '데이터 기반 투자 의사결정 도구',
    description: '시장 데이터 수집, 기술적 분석, 매물대 탐지를 자동화합니다. AI가 분석하고, 사람이 결정합니다.',
    status: 'development',
    category: 'investing',
    features: [
      '실시간 시장 데이터 수집 & 정제',
      '매물대 자동 탐지 & 시각화',
      'AI 기반 기술적 분석 리포트',
      '맞춤형 알림 시스템',
    ],
  },
  {
    slug: 'blogpro',
    name: 'BlogPro',
    tagline: '네이버 블로그 자동화 시스템',
    description: 'AI가 키워드를 분석하고, 글을 생성하고, 네이버 블로그에 자동 발행합니다. 1인 운영자를 위한 콘텐츠 자동화.',
    status: 'beta',
    category: 'building',
    features: [
      'AI 키워드 리서치 & 주제 추천',
      'Claude/GPT 기반 글 자동 생성',
      'Playwright 기반 네이버 자동 발행',
      '발행 스케줄링 & 성과 추적',
    ],
  },
];

export const STATUS_LABELS: Record<ProductStatus, { label: string; color: string }> = {
  development: { label: '개발 중', color: 'var(--color-text-muted)' },
  beta: { label: '베타', color: 'var(--color-accent)' },
  live: { label: '운영 중', color: '#4ade80' },
};
