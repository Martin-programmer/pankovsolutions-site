// Lighthouse CI срещу `npm run preview` (localhost:4321), mobile емулация (по подразбиране).
// Пускане: npm run audit:lh   (отчетите са в .lighthouseci/, gitignore-нати)
const base = process.env.LHCI_BASE ?? 'http://localhost:4321';

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
