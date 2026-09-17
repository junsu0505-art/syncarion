// api/contact.test.mjs — jun-001/002/003 회귀 방지 테스트
// 실행: node --test api/contact.test.mjs   (node:test 내장, 추가 설치 불필요)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, {
  escapeHtml,
  sanitizeHeaderValue,
  getClientIp,
  checkRateLimit,
  validateContactInput,
} from './contact.js';

// ---- escapeHtml (jun-002) ----

test('escapeHtml escapes all HTML-special characters', () => {
  assert.equal(
    escapeHtml(`<script>alert('x')</script>&"end`),
    '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;&quot;end'
  );
});

test('escapeHtml handles null/undefined safely', () => {
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(null), '');
});

// ---- sanitizeHeaderValue ----

test('sanitizeHeaderValue strips CR/LF (header injection defense)', () => {
  assert.equal(sanitizeHeaderValue('foo\r\nBcc: attacker@evil.com'), 'foo Bcc: attacker@evil.com');
});

// ---- getClientIp ----

test('getClientIp reads first entry of x-forwarded-for', () => {
  const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } };
  assert.equal(getClientIp(req), '1.2.3.4');
});

test('getClientIp falls back to socket remoteAddress', () => {
  const req = { headers: {}, socket: { remoteAddress: '9.9.9.9' } };
  assert.equal(getClientIp(req), '9.9.9.9');
});

// ---- checkRateLimit (jun-003) ----

test('checkRateLimit allows up to the max then blocks within the window', () => {
  const store = new Map();
  const now = 1000;
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit('1.1.1.1', now, store), true, `request ${i + 1} should pass`);
  }
  assert.equal(checkRateLimit('1.1.1.1', now, store), false, '6th request should be blocked');
});

test('checkRateLimit resets after the window elapses', () => {
  const store = new Map();
  for (let i = 0; i < 5; i++) checkRateLimit('2.2.2.2', 0, store);
  assert.equal(checkRateLimit('2.2.2.2', 0, store), false);
  assert.equal(checkRateLimit('2.2.2.2', 10 * 60 * 1000 + 1, store), true);
});

test('checkRateLimit tracks IPs independently', () => {
  const store = new Map();
  for (let i = 0; i < 5; i++) checkRateLimit('3.3.3.3', 0, store);
  assert.equal(checkRateLimit('3.3.3.3', 0, store), false);
  assert.equal(checkRateLimit('4.4.4.4', 0, store), true);
});

// ---- validateContactInput (jun-002/003) ----

test('validateContactInput rejects missing required fields', () => {
  assert.deepEqual(validateContactInput({}), { error: '필수 항목을 입력해주세요.' });
});

test('validateContactInput flags the honeypot field', () => {
  const result = validateContactInput({
    name: 'a',
    email: 'a@b.com',
    message: 'm',
    type: '진단',
    website: 'http://spam.example',
  });
  assert.deepEqual(result, { honeypot: true });
});

test('validateContactInput rejects malformed email', () => {
  const result = validateContactInput({ name: 'a', email: 'not-an-email', message: 'm', type: '진단' });
  assert.equal(result.error, '올바른 이메일 주소를 입력해주세요.');
});

test('validateContactInput rejects a type outside the whitelist', () => {
  const result = validateContactInput({ name: 'a', email: 'a@b.com', message: 'm', type: '<script>' });
  assert.equal(result.error, '관심 서비스를 선택해주세요.');
});

test('validateContactInput rejects oversized message', () => {
  const result = validateContactInput({
    name: 'a',
    email: 'a@b.com',
    message: 'x'.repeat(5001),
    type: '진단',
  });
  assert.equal(result.error, '입력이 너무 깁니다.');
});

test('validateContactInput accepts a well-formed submission', () => {
  const result = validateContactInput({
    name: '홍길동',
    email: 'hong@example.com',
    message: '문의합니다',
    type: '구축',
  });
  assert.deepEqual(result, {
    value: { name: '홍길동', email: 'hong@example.com', type: '구축', message: '문의합니다' },
  });
});

// ---- handler integration (jun-001: 확인 메일 제거 확인) ----

function makeRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    ended: false,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res;
}

test('handler sends exactly one Resend call (no confirmation-mail relay) and escapes payload', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { ok: true, json: async () => ({ id: 'test' }) };
  };
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-key';

  try {
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
      socket: {},
      body: {
        name: '<b>hacker</b>',
        email: 'victim@example.com',
        type: '진단',
        message: '<img src=x onerror=alert(1)>',
      },
    };
    const res = makeRes();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true });

    // jun-001: 확인 메일(수신자=요청자 email)이 더 이상 발송되지 않는다 — 호출 1건만.
    assert.equal(calls.length, 1, 'only the operator notification should be sent');
    assert.deepEqual(calls[0].body.to, ['master@decisionlabs.app']);

    // jun-002: name/message 가 이스케이프되어 태그가 살아있지 않다.
    assert.ok(!calls[0].body.html.includes('<b>hacker</b>'));
    assert.ok(calls[0].body.html.includes('&lt;b&gt;hacker&lt;/b&gt;'));
    assert.ok(!calls[0].body.html.includes('<img src=x'));
  } finally {
    globalThis.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalKey;
  }
});

test('handler returns 400 without touching the network when body is missing (jun-003)', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('should not be called');
  };

  try {
    const req = { method: 'POST', headers: {}, socket: {}, body: undefined };
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('handler 429s the 6th request from the same IP within the window', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ id: 'test' }) });
  process.env.RESEND_API_KEY = 'test-key';

  const baseReq = () => ({
    method: 'POST',
    headers: { 'x-forwarded-for': '77.77.77.77' },
    socket: {},
    body: { name: 'a', email: 'a@b.com', type: '진단', message: 'm' },
  });

  try {
    let lastStatus;
    for (let i = 0; i < 6; i++) {
      const res = makeRes();
      await handler(baseReq(), res);
      lastStatus = res.statusCode;
    }
    assert.equal(lastStatus, 429);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
