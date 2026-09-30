/** `iconSvg` (S7, e.g. from `icon('camera', 16)`) is optional so existing rows without a good
 *  icon match stay plain text - only prepended when given. */
export function labelledRow(
  label: string,
  control: HTMLElement,
  iconSvg?: string
): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'menu-row';
  const span = document.createElement('span');
  span.className = 'menu-row-label';
  if (iconSvg) span.innerHTML = iconSvg;
  span.append(document.createTextNode(label));
  row.append(span, control);
  return row;
}

export function slider(
  min: number,
  max: number,
  step: number,
  value: number,
  onInput: (v: number) => void
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => onInput(Number(input.value)));
  return input;
}

export function toggle(checked: boolean, onChange: (v: boolean) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

export function select<T extends string>(
  options: { value: T; label: string }[],
  value: T,
  onChange: (v: T) => void
): HTMLSelectElement {
  const sel = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    sel.appendChild(opt);
  }
  sel.value = value;
  sel.addEventListener('change', () => onChange(sel.value as T));
  return sel;
}
