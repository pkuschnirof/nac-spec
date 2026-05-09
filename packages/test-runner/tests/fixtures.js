/* Fixtures: hand-rolled describe_v2() snapshots used by the
   planner / matcher / coverage tests. ASCII-only. */
'use strict';

/* Page A snapshot: dashboard, no SMTP visible. */
exports.snapshotPageA = {
  nac_version: '2.0.0-rc5',
  timestamp: 1715200000000,
  tenant_prefix: 'cross_page_demo',
  v1_plugins: [
    { plugin_slug: 'topbar',
      elements: [
        { id: 'topbar.dashboard', role: 'navigation',
          label_i18n: { es: 'Tablero', en: 'Dashboard' } },
        { id: 'topbar.settings', role: 'navigation',
          label_i18n: { es: 'Configuracion', en: 'Settings' } }
      ]
    },
    { plugin_slug: 'dashboard.autopilot',
      elements: [
        { id: 'dashboard.autopilot.run', role: 'action',
          actions: [{ verb: 'play' }] }
      ]
    }
  ],
  v2_scope_entries: [
    { slug: 'shell',     role: null, label_i18n: { es: 'Demo', en: 'Demo' } },
    { slug: 'topbar',    role: null, label_i18n: { es: 'Topbar', en: 'Topbar' } },
    { slug: 'dashboard', role: null, label_i18n: { es: 'Tablero', en: 'Dashboard' } }
  ],
  v2_intermediate_scopes: [],
  virtual: [],
  ephemeral_log: [],
  locale: 'es',
  supported_locales: ['es','en','pt','fr','it','de','ja','zh','hi','ar'],
  sitemap: {
    paths: [
      { slug: 'page.dashboard',
        label_i18n: { es: 'Tablero principal', en: 'Main dashboard' },
        affordance_to_navigate: [{ action: 'click', target: 'topbar.dashboard' }],
        tags: ['page', 'overview'] },
      { slug: 'page.settings',
        label_i18n: { es: 'Configuracion', en: 'Settings' },
        affordance_to_navigate: [{ action: 'click', target: 'topbar.settings' }],
        tags: ['page', 'configuration'] },
      { slug: 'settings.system.smtp',
        label_i18n: { es: 'Configuracion SMTP', en: 'SMTP settings' },
        affordance_to_navigate: [
          { action: 'click', target: 'topbar.settings' },
          { action: 'focus', target: 'settings.system.smtp.host' }
        ],
        requires_permission: ['admin'],
        tags: ['integration', 'mail', 'configuration'] }
    ]
  }
};

/* Page B snapshot: settings page, SMTP form is visible. */
exports.snapshotPageB = {
  nac_version: '2.0.0-rc5',
  timestamp: 1715200030000,
  tenant_prefix: 'cross_page_demo',
  v1_plugins: [
    { plugin_slug: 'topbar',
      elements: [
        { id: 'topbar.dashboard', role: 'navigation',
          label_i18n: { es: 'Tablero', en: 'Dashboard' } },
        { id: 'topbar.settings', role: 'navigation',
          label_i18n: { es: 'Configuracion', en: 'Settings' } }
      ]
    },
    { plugin_slug: 'settings.system.smtp',
      elements: [
        { id: 'settings.system.smtp.host', role: 'textbox',
          label_i18n: { es: 'Servidor SMTP', en: 'SMTP host' } },
        { id: 'settings.system.smtp.port', role: 'textbox',
          label_i18n: { es: 'Puerto SMTP',   en: 'SMTP port' } },
        { id: 'settings.system.smtp.user', role: 'textbox',
          label_i18n: { es: 'Usuario SMTP',  en: 'SMTP user' } },
        { id: 'settings.system.smtp.save', role: 'action',
          actions: [{ verb: 'save', label_i18n: {
            es: 'Guardar configuracion SMTP',
            en: 'Save SMTP settings' } }] }
      ]
    }
  ],
  v2_scope_entries: [
    { slug: 'shell',                       role: null, label_i18n: { es: 'Demo', en: 'Demo' } },
    { slug: 'shell.topbar',                role: null, label_i18n: { es: 'Topbar', en: 'Topbar' } },
    { slug: 'shell.settings',              role: null, label_i18n: { es: 'Configuracion', en: 'Settings' } },
    { slug: 'shell.settings.system',       role: null, label_i18n: { es: 'Sistema', en: 'System' } },
    { slug: 'shell.settings.system.smtp',  role: null, label_i18n: { es: 'SMTP', en: 'SMTP' } }
  ],
  v2_intermediate_scopes: [],
  virtual: [],
  ephemeral_log: [],
  locale: 'es',
  supported_locales: ['es','en','pt','fr','it','de','ja','zh','hi','ar'],
  sitemap: exports_sitemap()  /* same as page A */
};

function exports_sitemap() {
  return {
    paths: [
      { slug: 'page.dashboard',
        label_i18n: { es: 'Tablero principal', en: 'Main dashboard' },
        affordance_to_navigate: [{ action: 'click', target: 'topbar.dashboard' }],
        tags: ['page', 'overview'] },
      { slug: 'page.settings',
        label_i18n: { es: 'Configuracion', en: 'Settings' },
        affordance_to_navigate: [{ action: 'click', target: 'topbar.settings' }],
        tags: ['page', 'configuration'] },
      { slug: 'settings.system.smtp',
        label_i18n: { es: 'Configuracion SMTP', en: 'SMTP settings' },
        affordance_to_navigate: [
          { action: 'click', target: 'topbar.settings' },
          { action: 'focus', target: 'settings.system.smtp.host' }
        ],
        requires_permission: ['admin'],
        tags: ['integration', 'mail', 'configuration'] }
    ]
  };
}
