export interface TuningBinding {
  /** Dotted label, e.g. "vehicle.topSpeed". Also the key in the exported JSON. */
  label: string;
  get(): number;
  set(value: number): void;
  min: number;
  max: number;
  step?: number;
}

export interface TuningPanelOptions {
  parent?: HTMLElement;
  /** Key that toggles the panel (default F1). */
  toggleCode?: string;
  target?: EventTarget;
}

/**
 * K3: F1 opens sliders bound to live config values so handling and balance can be
 * tuned while playing. "Copy JSON" exports the current values to paste into config.
 */
export class TuningPanel {
  readonly el: HTMLDivElement;
  private readonly inputs = new Map<string, HTMLInputElement>();
  private readonly outputs = new Map<string, HTMLSpanElement>();
  private readonly toggleCode: string;
  private readonly target: EventTarget;
  private readonly bindings: TuningBinding[];

  constructor(bindings: TuningBinding[], options: TuningPanelOptions = {}) {
    this.bindings = bindings;
    this.toggleCode = options.toggleCode ?? 'F1';
    this.target = options.target ?? window;
    this.el = document.createElement('div');
    this.el.id = 'tuning-panel';
    this.el.hidden = true;

    const title = document.createElement('div');
    title.className = 'tuning-title';
    title.textContent = 'Live tuning (F1 to close)';
    this.el.appendChild(title);

    for (const b of bindings) {
      const row = document.createElement('label');
      row.className = 'tuning-row';
      const name = document.createElement('span');
      name.textContent = b.label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(b.min);
      input.max = String(b.max);
      input.step = String(b.step ?? (b.max - b.min) / 100);
      input.value = String(b.get());
      input.dataset.label = b.label;
      const out = document.createElement('span');
      out.className = 'tuning-value';
      out.textContent = format(b.get());
      input.addEventListener('input', () => {
        const v = Number(input.value);
        b.set(v);
        out.textContent = format(v);
      });
      row.append(name, input, out);
      this.el.appendChild(row);
      this.inputs.set(b.label, input);
      this.outputs.set(b.label, out);
    }

    const actions = document.createElement('div');
    actions.className = 'tuning-actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy JSON';
    copy.addEventListener('click', () => {
      const json = this.exportJson();
      navigator.clipboard?.writeText(json).catch(() => undefined);
      copy.textContent = 'Copied!';
      setTimeout(() => (copy.textContent = 'Copy JSON'), 1200);
    });
    const pre = document.createElement('pre');
    pre.className = 'tuning-json';
    copy.addEventListener('click', () => (pre.textContent = this.exportJson()));
    actions.append(copy);
    this.el.append(actions, pre);

    (options.parent ?? document.body).appendChild(this.el);
    this.target.addEventListener('keydown', this.onKeyDown);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  toggle(force?: boolean): void {
    const show = force ?? this.el.hidden;
    this.el.hidden = !show;
    if (show) this.refresh();
  }

  /** Re-read every binding (e.g. after something else changed the config). */
  refresh(): void {
    for (const b of this.bindings) {
      this.inputs.get(b.label)!.value = String(b.get());
      this.outputs.get(b.label)!.textContent = format(b.get());
    }
  }

  /** Nested JSON matching the config layout, e.g. {"vehicle":{"topSpeed":50}}. */
  exportJson(): string {
    const root: Record<string, unknown> = {};
    for (const b of this.bindings) {
      const path = b.label.split('.');
      let node = root;
      for (const key of path.slice(0, -1)) {
        node = (node[key] ??= {}) as Record<string, unknown>;
      }
      node[path[path.length - 1]] = b.get();
    }
    return JSON.stringify(root, null, 2);
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.el.remove();
  }

  private onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.code !== this.toggleCode) return;
    e.preventDefault();
    this.toggle();
  };
}

function format(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
}

/** Helper to bind a numeric property of a live config object. */
export function bind<T extends object, K extends keyof T>(
  label: string,
  obj: T,
  key: K & (T[K] extends number ? K : never),
  min: number,
  max: number,
  step?: number
): TuningBinding {
  return {
    label,
    get: () => obj[key] as unknown as number,
    set: (v) => {
      (obj as Record<K, number>)[key] = v;
    },
    min,
    max,
    step,
  };
}
