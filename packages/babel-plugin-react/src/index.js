/* ===============================================================
   @nac-spec/babel-plugin-react -- skeleton
   ---------------------------------------------------------------
   Auto-injects data-nac-id into JSX elements based on:
     - component name (PascalCase + camelCase parsed to dot-slug)
     - key prop (when present, used as leaf)
     - data-nac-action attr (preserved verbatim)

   Status: skeleton. Real implementation coming in phase 4.
   ASCII-only.
   =============================================================== */
'use strict';

module.exports = function nacBabelPluginReact(api) {
  api.assertVersion(7);
  const t = api.types;

  return {
    name: '@nac-spec/babel-plugin-react',
    visitor: {
      JSXOpeningElement(path, state) {
        /* Skip elements that already have data-nac-id */
        const hasNacId = path.node.attributes.some(function (attr) {
          return attr.type === 'JSXAttribute'
              && attr.name.type === 'JSXIdentifier'
              && attr.name.name === 'data-nac-id';
        });
        if (hasNacId) return;

        /* Find enclosing component name */
        const componentPath = path.findParent(function (p) {
          return p.isFunctionDeclaration()
              || p.isFunctionExpression()
              || p.isArrowFunctionExpression()
              || p.isClassDeclaration();
        });

        if (!componentPath) return;
        const componentName = componentPath.node.id ? componentPath.node.id.name : null;
        if (!componentName) return;

        /* Convert PascalCase to dot-slug: ContactCard -> contact.card */
        const slug = componentName
          .replace(/([A-Z])/g, function (m, c, i) { return (i > 0 ? '.' : '') + c.toLowerCase(); });

        /* Find element name (e.g. <button>, <div>) */
        const elementName = path.node.name.type === 'JSXIdentifier'
          ? path.node.name.name
          : 'element';

        /* Find key attribute if present */
        const keyAttr = path.node.attributes.find(function (attr) {
          return attr.type === 'JSXAttribute'
              && attr.name.type === 'JSXIdentifier'
              && attr.name.name === 'key';
        });

        let leafSlug = elementName;
        if (keyAttr && keyAttr.value && keyAttr.value.type === 'StringLiteral') {
          leafSlug = elementName + '-' + keyAttr.value.value;
        }

        const fullSlug = slug + '.' + leafSlug;

        /* Inject data-nac-id attribute */
        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-nac-id'),
            t.stringLiteral(fullSlug)
          )
        );
      }
    }
  };
};
