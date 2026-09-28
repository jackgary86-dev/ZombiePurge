/** Small corner label so testers can tell which build they're playing (K1). */
export function showBuildTag(parent: HTMLElement = document.body): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'build-tag';
  const when = __BUILD_TIME__.slice(0, 16).replace('T', ' ');
  el.textContent = `build #${__BUILD_NUMBER__} · ${__BUILD_HASH__} · ${when} UTC`;
  el.title = 'ZombiePurge build';
  parent.appendChild(el);
  return el;
}
