/**
 * I11: the ZombiePurge wordmark. It reuses the favicon's slashed-Z glyph (public/favicon.svg)
 * scaled up next to the game name, so the logo, the tab icon and the build's own branding all
 * read as one identity. Rendered inline (not an <img src>) so it inherits the page's display
 * font once it loads, and needs no network request of its own.
 */
export function renderLogo(): string {
  return (
    `<svg class="zp-logo" viewBox="0 0 460 120" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="ZombiePurge">` +
    `<rect x="4" y="10" width="96" height="96" rx="16" fill="#c8402e"/>` +
    `<path d="M21 33h60v13l-41 28h41v13H21v-13l41-28H21z" fill="#f4e9d8"/>` +
    `<circle cx="80" cy="33" r="7" fill="#9cff3a"/>` +
    `<text x="114" y="58" class="zp-logo-word zp-logo-word-a">ZOMBIE</text>` +
    `<text x="114" y="102" class="zp-logo-word zp-logo-word-b">PURGE</text>` +
    `<path d="M114 68h336" class="zp-logo-slash"/>` +
    `</svg>`
  );
}
