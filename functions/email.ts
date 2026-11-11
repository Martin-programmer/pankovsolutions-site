import { company } from '../src/data/company';
import type { Locale } from './messages';

// Брандирани HTML имейли (таблична верстка с inline стилове, както изискват пощенските
// клиенти) + текстова версия за всеки. Цветовете и формите следват сайта: navy #0A2A66,
// lime #C6F24E, асиметрични ъгли.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = (s: string) => esc(s).replace(/\r?\n/g, '<br>');

const FONT = "Manrope, 'Segoe UI', Arial, sans-serif";
const HEAD = "Onest, 'Segoe UI', Arial, sans-serif";

export interface MailRow {
  label: string;
  value: string;
}

interface Layout {
  locale: Locale;
  preheader: string;
  eyebrow?: string;
  title: string;
  paragraphs: string[]; // HTML-безопасни (ползвай esc) или текст с позволени <b>, <a>
  rows?: MailRow[];
  note?: string; // текст в рамка (цитат от съобщението)
  cta?: { href: string; label: string };
  after?: string[];
  internal?: boolean; // известие до нас: по-стегнат подпис
}

function layout(o: Layout): string {
  const t = o.locale === 'bg'
    ? { company: `${company.name} · ЕИК ${company.eik}`, addr: company.address, why: 'Получавате този имейл, защото попълнихте форма на pankovsolutions.com.' }
    : { company: `${company.nameEn} · Company ID ${company.eik}`, addr: `${company.streetEn}, ${company.postalCode} ${company.cityEn}, Bulgaria`, why: 'You are receiving this email because you filled in a form on pankovsolutions.com.' };
  const rows = (o.rows ?? [])
    .filter((r) => r.value)
    .map(
      (r) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E3E9F2;width:38%;vertical-align:top;font:600 14px/20px ${FONT};color:#4A5872;">${esc(r.label)}</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #E3E9F2;vertical-align:top;font:400 15px/22px ${FONT};color:#0B1B3A;">${nl2br(r.value)}</td></tr>`,
    )
    .join('');
  const p = (html: string) => `<p style="margin:0 0 16px;font:400 16px/26px ${FONT};color:#2B3A55;">${html}</p>`;
  return `<!doctype html>
<html lang="${o.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>*{font-feature-settings:"locl" 0 !important}</style><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#F6F8FB;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FB;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="padding:0 4px 20px;"><a href="${company.site}${o.locale === 'en' ? '/en' : ''}" style="text-decoration:none;"><img src="${company.site}/img/logo.png" width="143" height="50" alt="Pankov Solutions" style="display:block;height:50px;width:auto;border:0;"></a></td></tr>
<tr><td style="background:#FFFFFF;border-radius:16px 64px 16px 16px;padding:36px 36px 28px;">
${o.eyebrow ? `<p style="margin:0 0 10px;font:600 14px/20px ${HEAD};color:#2563EB;">${esc(o.eyebrow)}</p>` : ''}
<h1 style="margin:0 0 18px;font:600 26px/34px ${HEAD};color:#0B1B3A;letter-spacing:-0.01em;">${esc(o.title)}</h1>
${o.paragraphs.map(p).join('\n')}
${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-top:1px solid #E3E9F2;">${rows}</table>` : ''}
${o.note ? `<div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:#F6F8FB;border-left:4px solid #0A2A66;font:400 15px/24px ${FONT};color:#0B1B3A;">${nl2br(o.note)}</div>` : ''}
${o.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="border-radius:10px;background:#0A2A66;"><a href="${o.cta.href}" style="display:inline-block;padding:14px 24px;font:600 15px/20px ${FONT};color:#FFFFFF;text-decoration:none;border-radius:10px;">${esc(o.cta.label)}</a></td></tr></table>` : ''}
${(o.after ?? []).map(p).join('\n')}
</td></tr>
<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:8px;width:72%;background:#0A2A66;border-radius:0 0 0 8px;font-size:0;line-height:0;">&nbsp;</td><td style="height:8px;background:#C6F24E;border-radius:0 0 8px 0;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:22px 4px 0;font:400 13px/20px ${FONT};color:#4A5872;">
<b style="color:#0B1B3A;">Pankov Solutions</b> · <a href="${company.phoneHref}" style="color:#2563EB;text-decoration:none;">${company.phone}</a> · <a href="mailto:${company.contactEmail}" style="color:#2563EB;text-decoration:none;">${company.contactEmail}</a><br>
${esc(t.company)}<br>${esc(t.addr)}${o.internal ? '' : `<br><span style="color:#66748C;">${esc(t.why)}</span>`}
</td></tr>
</table></td></tr></table></body></html>`;
}

function text(o: Layout): string {
  const strip = (s: string) => s.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return [
    o.title,
    '',
    ...o.paragraphs.map(strip).flatMap((x) => [x, '']),
    ...(o.rows ?? []).filter((r) => r.value).map((r) => `${r.label}: ${r.value}`),
    o.rows?.length ? '' : null,
    o.note ? `${o.note}\n` : null,
    o.cta ? `${o.cta.label}: ${o.cta.href}\n` : null,
    ...(o.after ?? []).map(strip).flatMap((x) => [x, '']),
    '—',
    `Pankov Solutions · ${company.phone} · ${company.contactEmail}`,
    o.locale === 'bg' ? `${company.name} · ЕИК ${company.eik}` : `${company.nameEn} · Company ID ${company.eik}`,
  ]
    .filter((x) => x !== null)
    .join('\n');
}

export interface Mail {
  subject: string;
  html: string;
  text: string;
}

const build = (subject: string, o: Layout): Mail => ({ subject, html: layout(o), text: text(o) });

// ---- Запитване: известие до нас -------------------------------------------------------
export function inquiryNotification(d: {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  locale: Locale;
  page?: string;
}): Mail {
  return build(`Ново запитване: ${d.name}${d.company ? `, ${d.company}` : ''}`, {
    locale: 'bg',
    internal: true,
    preheader: d.message.slice(0, 120),
    eyebrow: 'Запитване от сайта',
    title: `Ново запитване от ${d.name}`,
    paragraphs: ['Отговорете директно на този имейл, за да пишете на клиента.'],
    rows: [
      { label: 'Име', value: d.name },
      { label: 'Фирма', value: d.company ?? '' },
      { label: 'Имейл', value: d.email },
      { label: 'Телефон', value: d.phone ?? '' },
      { label: 'Интересува се от', value: d.service ?? '' },
      { label: 'Език', value: d.locale === 'bg' ? 'български' : 'английски' },
    ],
    note: d.message,
    cta: d.phone ? { href: `tel:${d.phone.replace(/[^\d+]/g, '')}`, label: `Обади се на ${d.phone}` } : undefined,
  });
}

// ---- Запитване: автоматичен отговор до клиента ---------------------------------------
export function inquiryAutoreply(d: { name: string; message: string; service?: string; locale: Locale }): Mail {
  const first = d.name.split(/\s+/)[0];
  if (d.locale === 'en') {
    return build('We received your enquiry – Pankov Solutions', {
      locale: 'en',
      preheader: 'We will reply within one business day.',
      eyebrow: 'Enquiry received',
      title: `Thank you, ${first}!`,
      paragraphs: [
        'We have received your enquiry and will reply within <b>one business day</b>. If anything is urgent, call us on <a href="' + company.phoneHref + '" style="color:#2563EB;">' + company.phone + '</a>.',
        'Here is a copy of what you sent us:',
      ],
      rows: d.service ? [{ label: 'Interested in', value: d.service }] : [],
      note: d.message,
      after: ['What happens next: we read your description, check how we can help and get in touch to arrange a free consultation.'],
      cta: { href: `${company.site}/en/projects`, label: 'See our projects' },
    });
  }
  return build('Получихме запитването Ви – Pankov Solutions', {
    locale: 'bg',
    preheader: 'Ще Ви отговорим до 1 работен ден.',
    eyebrow: 'Запитването е получено',
    title: `Благодарим Ви, ${first}!`,
    paragraphs: [
      'Получихме запитването Ви и ще Ви отговорим <b>до 1 работен ден</b>. Ако е спешно, обадете се на <a href="' + company.phoneHref + '" style="color:#2563EB;">' + company.phoneLocal + '</a>.',
      'Ето копие на това, което ни изпратихте:',
    ],
    rows: d.service ? [{ label: 'Интересувате се от', value: d.service }] : [],
    note: d.message,
    after: ['Какво следва: запознаваме се с описанието, проверяваме как можем да помогнем и се свързваме с Вас, за да уговорим безплатна консултация.'],
    cta: { href: `${company.site}/projects`, label: 'Вижте нашите проекти' },
  });
}

// ---- Проверка за ЕС финансиране: известие до нас --------------------------------------
export function surveyNotification(d: { ref: string; rows: MailRow[]; company: string; locale: Locale; description: string }): Mail {
  return build(`Лист с чакащи (ЕС): ${d.company} · ${d.ref}`, {
    locale: 'bg',
    internal: true,
    preheader: d.description.slice(0, 120),
    eyebrow: `Проверка за европейско финансиране · ${d.ref}`,
    title: `${d.company} се вписа в листа с чакащи`,
    paragraphs: [`Език на формата: ${d.locale === 'bg' ? 'български' : 'английски'}. Отговорете на този имейл, за да пишете на заявителя.`],
    rows: d.rows,
    note: d.description,
  });
}

// ---- Проверка за ЕС финансиране: потвърждение до заявителя --------------------------
export function surveyAutoreply(d: { ref: string; name: string; company: string; locale: Locale }): Mail {
  const first = d.name.split(/\s+/)[0];
  if (d.locale === 'en') {
    return build(`You are on the EU funding waiting list – ${d.ref}`, {
      locale: 'en',
      preheader: 'Our partner will review your answers and call you.',
      eyebrow: 'EU funding check',
      title: `${first}, ${d.company} is on the waiting list`,
      paragraphs: [
        'Thank you for completing the check. Our partner, Eco Globe Ltd., will review your answers and the company’s public records and will call you to discuss the options.',
        `Your reference number is <b>${esc(d.ref)}</b>.`,
        'Please keep in mind: from idea to approval usually takes between 1 and 2 years, and not every project can be funded. The waiting list is for future plans.',
      ],
      after: ['You can leave the waiting list at any time by replying to this email.'],
      cta: { href: `${company.site}/en/services`, label: 'See what we build' },
    });
  }
  return build(`Вписахме Ви в листа с чакащи за ЕС финансиране – ${d.ref}`, {
    locale: 'bg',
    preheader: 'Партньорът ни ще прегледа отговорите и ще Ви се обади.',
    eyebrow: 'Проверка за европейско финансиране',
    title: `${first}, вписахме ${d.company} в листа с чакащи`,
    paragraphs: [
      'Благодарим Ви, че попълнихте проверката. Партньорът ни „Еко Глоуб“ ООД ще прегледа отговорите и публичните данни на фирмата и ще Ви се обади, за да обсъдите възможностите.',
      `Номерът на заявката Ви е <b>${esc(d.ref)}</b>.`,
      'Напомняме, че от идеята до одобрението обикновено минават между 1 и 2 години и не всеки проект може да бъде финансиран. Листът с чакащи е за планове за бъдещето.',
    ],
    after: ['Можете да се отпишете от листа по всяко време с отговор на този имейл.'],
    cta: { href: `${company.site}/services`, label: 'Вижте какво изграждаме' },
  });
}
