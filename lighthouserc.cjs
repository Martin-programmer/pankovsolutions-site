// Lighthouse CI срещу `npm run serve:dist` (127.0.0.1:4177, serve с компресия), mobile
// емулация. Порт 4177 и 127.0.0.1 нарочно: `localhost:4321` може да отиде при забравен
// `astro dev` на [::1] и одитът да мери dev toolbar-а.
// Пускане: npm run audit:lh   (отчетите са в .lighthouseci/, gitignore-нати)
const base = process.env.LHCI_BASE ?? 'http://127.0.0.1:4177';

module.exports = {
  ci: {
    collect: {
      url: [
        `${base}/`,
        `${base}/projects`,
        `${base}/projects/domoupravitel-bulgaria`,
        `${base}/services`,
        `${base}/about`,
        `${base}/contact`,
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
