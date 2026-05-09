/* ===============================================================
   @nac-spec/svelte-preprocessor -- skeleton
   ---------------------------------------------------------------
   Svelte preprocessor that walks template AST and injects
   data-nac-id derived from component file name + key.
   Status: skeleton, phase 4 fills out.
   =============================================================== */
'use strict';
module.exports = function nacSveltePreprocessor() {
  return {
    name: '@nac-spec/svelte-preprocessor',
    markup({ content, filename }) {
      /* Phase 4: inject attributes via Svelte AST manipulation */
      return { code: content };
    }
  };
};
