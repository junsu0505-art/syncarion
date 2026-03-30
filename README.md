# Syncarion — syncarion.com

AI Build Partner 랜딩페이지 + 문의 폼 (Resend API)

## 프로젝트 구조

```
syncarion-site/
├── api/
│   └── contact.js          # Vercel Serverless Function (Resend 이메일 전송)
├── public/
│   ├── index.html           # 랜딩페이지
│   ├── logo.png             # ← 나노바나나 로고 이미지 넣기
│   ├── favicon.png          # ← 파비콘 (심볼만, 32x32 이상)
│   └── og-image.png         # ← OG 이미지 (1200x630, 소셜 공유용)
├── vercel.json              # Vercel 설정
├── package.json
├── .env.example
└── .gitignore
```

## 배포 방법

### 1. Resend 세팅
1. resend.com 가입
2. Domains → Add Domain → `syncarion.com`
3. Cloudflare DNS에 표시되는 레코드(MX, SPF, DKIM) 추가
4. API Keys → Create API Key → 복사

### 2. 이미지 파일 준비
나노바나나에서 만든 로고를 `public/` 폴더에 넣기:
- `logo.png` — 로고 이미지 (심볼 + 텍스트 또는 심볼만, 배경 투명 권장)
- `favicon.png` — 파비콘용 심볼 (32x32 이상)
- `og-image.png` — 카카오톡/슬랙 공유 시 미리보기 (1200x630)

### 3. GitHub + Vercel 배포
```bash
# GitHub 리포지토리 생성 후
git init
git add .
git commit -m "Initial commit - Syncarion landing"
git remote add origin https://github.com/YOUR_USERNAME/syncarion-site.git
git push -u origin main
```

1. vercel.com → New Project → GitHub 리포 연결
2. Settings → Environment Variables:
   - `RESEND_API_KEY` = `re_xxxxxxxxx` (Resend에서 발급받은 키)
3. Settings → Domains → `syncarion.com` 추가
4. Cloudflare DNS에 Vercel CNAME 레코드 추가

### 4. 테스트
- syncarion.com 접속 확인
- 문의 폼 전송 → hello@syncarion.com 수신 확인
- 신청자에게 자동 확인 이메일 발송 확인
- 카카오톡 오픈채팅 링크 동작 확인

## 폼 전송 플로우

```
사용자 폼 제출
  → POST /api/contact (Vercel Serverless Function)
    → Resend API 호출 #1: hello@syncarion.com으로 문의 내용 전달
    → Resend API 호출 #2: 신청자에게 접수 확인 이메일 발송
  → 성공/실패 응답 → UI 피드백
  → 실패 시 카카오톡 fallback 안내
```

## 환경변수

| 변수 | 설명 | 어디서 |
|------|------|--------|
| `RESEND_API_KEY` | Resend API 키 | resend.com → API Keys |

## 카카오톡 오픈채팅
https://open.kakao.com/o/sflud6ni
