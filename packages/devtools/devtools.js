/* ===============================================================
   NAC DevTools panel registration -- skeleton
   ---------------------------------------------------------------
   Creates a "NAC" tab in browser DevTools showing the live
   manifest tree, validation findings, and fix suggestions.

   Status: skeleton. Phase 4 of v2.0 roadmap implements:
     - Live manifest tree with expand/collapse per scope
     - Validation findings list (i18n, HMAC, isTrusted)
     - "Highlight in page" on hover
     - "Copy slug" / "Copy describe()" buttons
     - Fix suggestion engine for common gaps
   =============================================================== */
chrome.devtools.panels.create(
  'NAC',
  null,
  'panel.html',
  function(panel) {
    /* panel.html will live here once impl phase begins */
  }
);
