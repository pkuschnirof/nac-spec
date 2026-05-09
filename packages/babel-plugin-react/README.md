# @nac-spec/babel-plugin-react

Auto-injects `data-nac-id` into React JSX elements at build time so
NAC v2.0 can find them without manual annotation.

## Install

```bash
npm install --save-dev @nac-spec/babel-plugin-react
```

## Configure (`.babelrc` or `babel.config.js`)

```json
{
  "plugins": ["@nac-spec/babel-plugin-react"]
}
```

## What it does

For every JSX element:

1. If `data-nac-id` is already present, leaves it alone.
2. Otherwise, walks up to the enclosing component and derives a slug
   from `ComponentName -> component.name`.
3. Appends the element name + optional `key` prop to form the leaf:
   `ContactCard <button key="delete">` -> `contact.card.button-delete`
4. Injects the attribute `data-nac-id="contact.card.button-delete"`.

## Skeleton status (2026-05-09)

This is a skeleton. Full implementation follows in NAC v2.0 phase 4.
Production hardening pending:
- Server Components (RSC) support.
- Class components.
- HOC + forwardRef.
- Edge cases with destructuring + memo.

Until then, hand-annotate with `data-nac-id` for production code.

## License

MIT.
