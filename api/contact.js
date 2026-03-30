// api/contact.js — Vercel Serverless Function
// Resend API로 문의 이메일을 hello@syncarion.com으로 전송

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

  const { name, email, type, message } = req.body;

  // 간단한 유효성 검사
  if (!name || !email || !message) {
    return res.status(400).json({ error: '필수 항목을 입력해주세요.' });
  }

  // 이메일 형식 검사
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '올바른 이메일 주소를 입력해주세요.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Syncarion <noreply@syncarion.com>',
        to: ['hello@syncarion.com'],
        reply_to: email,
        subject: `[Syncarion] ${type} 문의 — ${name}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fafafa; border-radius: 8px;">
            <div style="border-bottom: 2px solid #c4a882; padding-bottom: 16px; margin-bottom: 24px;">
              <h2 style="margin: 0; color: #1a1a1a; font-size: 20px;">새로운 상담 신청</h2>
              <p style="margin: 4px 0 0; color: #888; font-size: 13px;">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; width: 100px; vertical-align: top; font-size: 14px;">이름/회사</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;"><strong>${name}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; vertical-align: top; font-size: 14px;">이메일</td>
                <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #c4a882;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; vertical-align: top; font-size: 14px;">관심 서비스</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; vertical-align: top; font-size: 14px;">내용</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #aaa; font-size: 12px;">
              이 이메일에 바로 답장하면 ${email}로 전송됩니다.
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

    // 신청자에게 자동 확인 이메일 발송
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Syncarion <hello@syncarion.com>',
        to: [email],
        subject: `[Syncarion] 상담 신청이 접수되었습니다`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">상담 신청이 접수되었습니다</h2>
            <p style="color: #555; line-height: 1.7;">
              ${name}님, 안녕하세요.<br><br>
              Syncarion에 관심을 가져주셔서 감사합니다.<br>
              보내주신 내용을 확인하고 <strong>24시간 이내</strong>에 회신 드리겠습니다.
            </p>
            <div style="margin-top: 24px; padding: 20px; background: #f8f6f3; border-radius: 8px; border-left: 3px solid #c4a882;">
              <p style="margin: 0; color: #888; font-size: 13px;">보내주신 내용</p>
              <p style="margin: 8px 0 0; color: #1a1a1a; font-size: 14px; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="margin-top: 24px; color: #555; line-height: 1.7;">
              급한 문의는 카카오톡으로도 연락 가능합니다.<br>
              <a href="https://open.kakao.com/o/sflud6ni" style="color: #c4a882;">카카오톡 오픈채팅 →</a>
            </p>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #aaa; font-size: 12px;">
              Syncarion — AI Build Partner<br>
              syncarion.com
            </div>
          </div>
        `,
      }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
