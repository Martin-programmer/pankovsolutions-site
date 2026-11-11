import type { APIRoute } from 'astro';
import { PAGES, pathFor } from '../data/pages';
import { company } from '../data/company';

// llms.txt: кратко описание на фирмата и списък на страниците за езикови модели.
export const GET: APIRoute = () => {
  const site = company.site;
  const list = (kind: string[]) =>
    PAGES.filter((p) => kind.includes(p.kind) && !p.noindex)
      .map((p) => `- [${p.name.en}](${site}${pathFor(p.key, 'en')}) ([BG](${site}${pathFor(p.key, 'bg') === '/' ? '' : pathFor(p.key, 'bg')})): ${p.description.en}`)
      .join('\n');
  const body = `# ${company.brand}

> ${company.brand} (${company.nameEn}, Bulgaria) builds business systems (Odoo ERP, CRM, warehouse management), online stores, custom web and mobile applications, integrations and IT infrastructure for small and medium-sized companies. The site is in Bulgarian (default) and English (/en).

Contact: ${company.phone} · ${company.contactEmail} · ${site}/en/contact

## Main pages
${list(['home', 'services', 'projects', 'page'])}

## Services
${list(['service'])}

## Projects
${list(['project'])}

## Legal
${list(['legal'])}
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
