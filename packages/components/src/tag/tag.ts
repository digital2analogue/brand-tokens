import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type TagVariant = 'default' | 'subtle';

/**
 * An outlined, uppercase tag / chip component.
 *
 * The deliberate inverse of `<rr-badge>`: where the badge is a filled pill for
 * status, the tag is a square-cornered (radius.sm), transparent-filled, bordered
 * label for skills, categories, and metadata. Content is rendered UPPERCASE with
 * all-caps letter-spacing, so authors pass normal-case text.
 *
 * Uses semantic design tokens for all visual properties. Brand theming
 * cascades automatically via CSS custom properties on `:root`.
 *
 * @slot - Tag label text
 */
@customElement('rr-tag')
export class RrTag extends LitElement {
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
   * tags and most labels. `subtle` is a quieter treatment (muted text,
   * elevated-border) for dense or secondary contexts.
   */
  @property({ reflect: true })
  variant: TagVariant = 'default';

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-tag': RrTag;
  }
}
