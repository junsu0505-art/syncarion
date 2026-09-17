// api/contact.js — Vercel Serverless Function
// Resend API로 문의 이메일을 master@decisionlabs.app으로 전송
// 발신(from)은 Resend 인증 도메인 syncarion.com 유지 — decisionlabs.app은 미인증이면 발송 실패
//
// 보안 수정 2026-09-18 (fleet-review jun-001/002/003):
// - jun-001: 신청자 확인 메일(임의 수신자에게 HTML 발송하는 공개 릴레이) 제거
// - jun-002: 운영자 메일 보간 4종 전부 HTML 이스케이프 + type 서버측 화이트리스트
// - jun-003: req.body 가드 + 필드 길이 상한 + honeypot + IP 단위 메모리 rate limit

const TYPES = ['진단', '구축', '유지보수', '기타'];
const LIMITS = { name: 200, email: 254, message: 5000 };
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10분
const RATE_LIMIT_MAX = 5; // 창당 IP 5건

// 콜드 스타트마다 리셋되는 best-effort 메모리 저장소.
// Vercel 서버리스는 인스턴스 재사용을 보장하지 않으므로 이것만으로 완전한
// 방어는 아니다 — 1차 저지선(스팸 감쇠) 목적. 영구 rate limit 이 필요하면
// Vercel KV/Upstash 등 외부 저장소 도입을 Tom 결재로 검토한다(§11).
const rateLimitStore = new Map();

export function escapeHtml(input) {
  return String(input ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  );
}

// 이메일 subject 삽입용 — CR/LF 제거(헤더 인젝션 방어), 길이 방어는 LIMITS 에서 처리.
export function sanitizeHeaderValue(input) {
  return String(input ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export function getClientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function checkRateLimit(ip, now = Date.now(), store = rateLimitStore) {
  const entry = store.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    store.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count += 1;
  return true;
}

// body 검증 — 순수 함수(네트워크 I/O 없음), 유닛 테스트 대상.
export function validateContactInput(body) {
  const { name, email, type, message, website } = body ?? {};

  // honeypot: 화면에 보이지 않는 필드가 채워지면 봇으로 간주하고 조용히 무시.
  if (typeof website === 'string' && website.trim().length > 0) {
    return { honeypot: true };
  }

  if (!name || !email || !message) {
    return { error: '필수 항목을 입력해주세요.' };
  }

  if (
    String(name).length > LIMITS.name ||
    String(email).length > LIMITS.email ||
    String(message).length > LIMITS.message
  ) {
    return { error: '입력이 너무 깁니다.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: '올바른 이메일 주소를 입력해주세요.' };
  }

  if (!TYPES.includes(type)) {
    return { error: '관심 서비스를 선택해주세요.' };
  }

  return {
    value: {
      name: String(name),
      email: String(email),
      type: String(type),
      message: String(message),
    },
  };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://syncarion.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  const result = validateContactInput(req.body ?? {});

  if (result.honeypot) {
    // 봇에게는 성공처럼 보이게 하고 실제로는 아무 것도 보내지 않는다.
    return res.status(200).json({ success: true });
  }
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const { name, email, type, message } = result.value;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeType = escapeHtml(type);
  const safeMessage = escapeHtml(message);
  const subjectName = sanitizeHeaderValue(name);
  const subjectType = sanitizeHeaderValue(type);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Syncarion <noreply@syncarion.com>',
        to: ['master@decisionlabs.app'],
        reply_to: email,
        subject: `[Syncarion] ${subjectType} 문의 — ${subjectName}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fafafa; border-radius: 8px;">
            <div style="border-bottom: 2px solid #c4a882; padding-bottom: 16px; margin-bottom: 24px;">
              <h2 style="margin: 0; color: #1a1a1a; font-size: 20px;">새로운 상담 신청</h2>
              <p style="margin: 4px 0 0; color: #888; font-size: 13px;">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; width: 100px; vertical-align: top; font-size: 14px;">이름/회사</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;"><strong>${safeName}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; vertical-align: top; font-size: 14px;">이메일</td>
                <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${safeEmail}" style="color: #c4a882;">${safeEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; vertical-align: top; font-size: 14px;">관심 서비스</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${safeType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; vertical-align: top; font-size: 14px;">내용</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; white-space: pre-wrap;">${safeMessage}</td>
              </tr>
            </table>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #aaa; font-size: 12px;">
              이 이메일에 바로 답장하면 ${safeEmail}로 전송됩니다.
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: '이메일 전송에 실패했습니다.' });
    }

    // 신청자 자동 확인 메일은 제거함(jun-001) — 임의 수신자에게 HTML 을 보내는
    // 공개 릴레이 벡터였다. 접수 확인은 폼 제출 성공 응답(Contact.astro)으로 갈음.

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
