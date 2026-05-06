/* nacify inferers -- derive nac-id / role / action / field-type
 * from the existing markup. ASCII-pure.
 */
'use strict';

const path = require('path');

const VERB_TABLE = {
  save: 'save', guardar: 'save', salvar: 'save',
  submit: 'submit', enviar: 'submit',
  cancel: 'cancel', cancelar: 'cancel',
  delete: 'delete', borrar: 'delete', eliminar: 'delete',
  remove: 'delete',
  edit: 'edit', editar: 'edit',
  apply: 'apply', aplicar: 'apply',
  retry: 'retry', reintentar: 'retry',
  refresh: 'refresh', recargar: 'refresh',
  close: 'close', cerrar: 'close',
  ok: 'confirm', confirm: 'confirm',
  next: 'next', siguiente: 'next',
  previous: 'prev', anterior: 'prev', back: 'prev',
  search: 'search', buscar: 'search',
  add: 'add', agregar: 'add', new: 'add', nuevo: 'add',
  upload: 'upload', subir: 'upload',
  download: 'download', bajar: 'download', descargar: 'download',
  open: 'open', abrir: 'open',
  copy: 'copy', copiar: 'copy',
  share: 'share', compartir: 'share',
  print: 'print', imprimir: 'print',
};

function pluginFromPath(filePath, override) {
  if (override) return slugify(override);
  if (!filePath) return 'app';
  const base = path.basename(filePath, path.extname(filePath));
  // strip framework suffixes
  return slugify(base.replace(/\.(component|view|page|tpl)$/i, ''));
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'item';
}

function visibleText(raw) {
  // Best-effort: pull up to ~50 chars after the closing > of the tag,
  // before any nested tag begins. We don't have parsed inner text here
  // (regex scanner), so this is a heuristic for the common simple case.
  return null;
}

function deriveBaseName(c) {
  const a = c.attrs;
  if (a['data-test'])    return slugify(a['data-test']);
  if (a['data-cy'])      return slugify(a['data-cy']);
  if (a['data-qa'])      return slugify(a['data-qa']);
  if (a['data-testid'])  return slugify(a['data-testid']);
  if (a['id'])           return slugify(a['id']);
  if (a['name'])         return slugify(a['name']);
  if (a['aria-label'])   return slugify(a['aria-label']);
  return null;
}

function deriveAction(c) {
  const a = c.attrs;
  if (c.tag === 'button' || (c.tag === 'a' && a['role'] === 'button')) {
    if (a['type'] === 'submit') return 'submit';
    // try aria-label / value
    const label = (a['aria-label'] || a['value'] || '').toLowerCase().trim();
    for (const k in VERB_TABLE) {
      if (label.includes(k)) return VERB_TABLE[k];
    }
    return null;
  }
  if (c.tag === 'input') {
    const t = (a['type'] || 'text').toLowerCase();
    if (t === 'submit') return 'submit';
    if (t === 'reset')  return 'reset';
    if (t === 'button') return null; // unknown verb
  }
  return null;
}

function deriveRole(c) {
  const a = c.attrs;
  if (a['role']) {
    const r = a['role'];
    if (['tab','tablist','tabpanel','combobox','listbox','slider','dialog'].indexOf(r) >= 0) {
      return r === 'dialog' ? 'plugin_root' : r;
    }
    if (r === 'button') return 'action';
  }
  if (c.tag === 'button')   return 'action';
  if (c.tag === 'a')        return 'action';
  if (c.tag === 'input') {
    const t = (a['type'] || 'text').toLowerCase();
    if (t === 'submit' || t === 'reset' || t === 'button') return 'action';
    return 'field';
  }
  if (c.tag === 'textarea') return 'field';
  if (c.tag === 'select')   return 'field';
  if (c.tag === 'dialog')   return 'plugin_root';
  if (c.tag === 'details')  return 'accordion-section';
  return null;
}

function deriveFieldType(c) {
  if (c.tag === 'textarea') return 'textarea';
  if (c.tag === 'select')   return 'select';
  if (c.tag === 'input') {
    const t = (c.attrs['type'] || 'text').toLowerCase();
    const map = {
      text: 'text', search: 'text', email: 'email', tel: 'tel',
      url: 'url', number: 'number', password: 'password',
      date: 'date', time: 'time', range: 'slider', color: 'color',
      file: 'file', checkbox: 'checkbox', radio: 'radio'
    };
    return map[t] || 'text';
  }
  return null;
}

function deriveState(c) {
  const a = c.attrs;
  if ('disabled' in a) return 'disabled';
  if (a['aria-disabled'] === 'true') return 'disabled';
  if (a['readonly'] != null) return 'readonly';
  const role = deriveRole(c);
  if (role === 'field') {
    return (a['value'] || a['placeholder']) ? 'idle' : 'empty';
  }
  return 'idle';
}

function fillInferred(candidates, opts) {
  const plugin = pluginFromPath(opts.filePath, opts.pluginPrefix);
  const used = Object.create(null);

  candidates.forEach(c => {
    if (c.alreadyAnnotated) return;
    const base = deriveBaseName(c);
    if (!base) {
      c.canInfer = false;
      c.gap = 'cannot derive id (no id, name, aria-label, or test attr)';
      return;
    }
    let id = plugin + '.' + base;
    let n = 2;
    while (used[id]) { id = plugin + '.' + base + '_' + n; n++; }
    used[id] = true;

    const role = deriveRole(c);
    const action = deriveAction(c);
    const ftype = deriveFieldType(c);
    const state = deriveState(c);

    const proposed = { 'data-nac-id': id };
    if (role)   proposed['data-nac-role'] = role;
    if (action) proposed['data-nac-action'] = action;
    if (ftype)  proposed['data-nac-field-type'] = ftype;
    if (state)  proposed['data-nac-state'] = state;
    c.canInfer = true;
    c.proposed = proposed;
  });
}

module.exports = { fillInferred, pluginFromPath, slugify };
