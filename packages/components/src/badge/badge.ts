import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent-green'
  | 'accent-blue'
  | 'accent-violet'
  | 'accent-amber';

/**
 * A status badge / chip component.
 *
 * Uses semantic design tokens for all visual properties.
 * Brand theming cascades automatically via CSS custom properties on `:root`.
 *
 * @slot - Badge label text
 */
@customElement('rr-badge')
export class RrBadge extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      border-radius: var(--radius-full);
      padding: var(--spacing-micro) var(--spacing-inline);
      font: var(--font-label-small);
      border: 1px solid var(--color-border-alt);
      background: var(--color-background-alt);
      color: var(--color-foreground-alt);
    }

    :host([variant='success']) {
      background: var(--color-background-success-alt);
      color: var(--color-foreground-success);
      border-color: var(--color-background-success-alt);
    }

    :host([variant='warning']) {
      background: var(--color-background-warning-alt);
      color: var(--color-foreground-warning);
      border-color: var(--color-background-warning-alt);
    }

    :host([variant='danger']) {
      background: var(--color-background-danger-alt);
      color: var(--color-foreground-danger);
      border-color: var(--color-background-danger-alt);
    }

    :host([variant='info']) {
      background: var(--color-background-info-alt);
      color: var(--color-foreground-info);
      border-color: var(--color-background-info-alt);
    }

    :host([variant='accent-green']) {
      background: var(--color-background-accent-green);
      color: var(--color-foreground-accent-green);
      border-color: var(--color-background-accent-green);
    }

    :host([variant='accent-blue']) {
      background: var(--color-background-accent-blue);
      color: var(--color-foreground-accent-blue);
      border-color: var(--color-background-accent-blue);
    }

    :host([variant='accent-violet']) {
      background: var(--color-background-accent-violet);
      color: var(--color-foreground-accent-violet);
      border-color: var(--color-background-accent-violet);
    }

    :host([variant='accent-amber']) {
      background: var(--color-background-accent-amber);
      color: var(--color-foreground-accent-amber);
      border-color: var(--color-background-accent-amber);
    }
  `;

  /**
   * Visual variant. Status variants (success, warning, danger, info) convey
   * semantic meaning. Accent variants are decorative emphasis tags.
   */
  @property({ reflect: true })
  variant: BadgeVariant = 'default';

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-badge': RrBadge;
  }
}
