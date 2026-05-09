/* ===============================================================
   @nac-spec/vue-plugin -- skeleton
   ---------------------------------------------------------------
   Vue 3 SFC compiler plugin. Auto-injects data-nac-id derived from
   component name + key prop, mirror of babel-plugin-react.

   Status: skeleton, phase 4 fills out.
   =============================================================== */
'use strict';
module.exports = function nacVuePlugin() {
  return {
    name: '@nac-spec/vue-plugin',
    transform(code, id) {
      /* Phase 4: SFC AST walk + inject data-nac-id */
      if (!id.endsWith('.vue')) return null;
      return null;
    }
  };
};
