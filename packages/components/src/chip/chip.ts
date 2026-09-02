import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type ChipVariant = 'default' | 'subtle';

/**
 * An outlined, uppercase chip — a discrete thing: a category, a skill, a
 * filter, a value someone chose.
 *
 * The deliberate counterpart to `<rr-badge>`, and the line between them is
 * **provenance, not interactivity**: a badge reports state the *system* decided
 * and you cannot influence (status, count, validity); a chip names a thing. So
 * the badge is a filled pill and the chip is a square-cornered (radius.sm),
 * transparent-filled, bordered label. Content is rendered UPPERCASE with
 * all-caps letter-spacing, so authors pass normal-case text.
 *
 * This element is the **static** chip and exposes no role. A chip may or may
 * not be actionable — most start static and grow a handler later, which is why
 * the noun covers both — but the interactive modes (pressed, removable,
 * popup trigger) are not built yet: see #229. Until they are, an interactive
 * chip is composed from `rr-button` or `rr-link`; do not attach handlers to
 * this host.
 *
 * Uses semantic design tokens for all visual properties. Brand theming
 * cascades automatically via CSS custom properties on `:root`.
 *
 * @slot - Chip label text
 */
@customElement('rr-chip')
export class RrChip extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-all-caps);
      font: var(--font-label-small);
      border-radius: var(--radius-sm);
      padding: var(--spacing-micro) var(--spacing-tight);
      border: 1px solid var(--color-foreground-muted);
      background: transparent;
      color: var(--color-foreground-alt);
    }

    :host([variant='subtle']) {
      background: transparent;
      color: var(--color-foreground-muted);
      border-color: var(--color-border-elevated);
    }
  `;

  /**
   * Emphasis level. `default` is the standard visible outline (alt text,
   * muted-foreground border) that reads correctly standalone — use it for skill
   * chips and most labels. `subtle` is a quieter treatment (muted text,
   * elevated-border) for dense or secondary contexts.
   */
  @property({ reflect: true })
  variant: ChipVariant = 'default';

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-chip': RrChip;
  }
}
