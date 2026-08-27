import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarColor = 'default' | 'indigo' | 'sky' | 'green' | 'amber';

/**
 * A circular identity surface showing initials or an image.
 *
 * When `src` is provided an `<img>` fills the circle. When omitted, up to two
 * initials are derived from `name` (first letter of each word, max two words).
 * Colorized variants use the accent-bold fill tier with matching on-* foreground
 * tokens — all pairs are WCAG AA verified.
 *
 * @slot - Optional custom content to replace initials (e.g. an icon)
 * @csspart avatar - The root circle element
 * @csspart img - The img element (only when src is set)
 * @csspart initials - The initials text element
 */
@customElement('rr-avatar')
export class RrAvatar extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }

    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      overflow: hidden;
      background: var(--color-background-alt);
      color: var(--color-foreground-alt);
      width: var(--spacing-group);
      height: var(--spacing-group);
      font: var(--font-label-strong-small);
      flex-shrink: 0;
      user-select: none;
      line-height: 1;
    }

    /* Sizes */
    :host([size='sm']) .avatar {
      width: var(--spacing-component);
      height: var(--spacing-component);
      font: var(--font-label-strong-xsmall);
    }

    :host([size='lg']) .avatar {
      width: 40px;
      height: 40px;
      font: var(--font-label-strong-medium);
    }

    :host([size='xl']) .avatar {
      width: var(--spacing-layout);
      height: var(--spacing-layout);
      font: var(--font-label-strong-medium);
    }

    /* Color variants */
    :host([color='indigo']) .avatar {
      background: var(--color-background-accent-indigo-bold);
      color: var(--color-foreground-accent-on-indigo);
    }

    :host([color='sky']) .avatar {
      background: var(--color-background-accent-sky-bold);
      color: var(--color-foreground-accent-on-sky);
    }

    :host([color='green']) .avatar {
      background: var(--color-background-accent-green-bold);
      color: var(--color-foreground-accent-on-green-bold);
    }

    :host([color='amber']) .avatar {
      background: var(--color-background-accent-amber-bold);
      color: var(--color-foreground-accent-on-amber-bold);
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;

  /** Circle diameter. */
  @property({ reflect: true }) size: AvatarSize = 'md';
  /** Accent-bold color variant for the initials surface. */
  @property({ reflect: true }) color: AvatarColor = 'default';
  /** Full name used to derive up to two initials and the accessible label. */
  @property() name = '';
  /** Image URL. When set, an img fills the circle instead of initials. */
  @property() src = '';
  /** Alt text for the image; falls back to name when omitted. */
  @property({ attribute: 'alt' }) imgAlt = '';

  private get _initials(): string {
    if (!this.name) return '';
    const words = this.name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  render() {
    const hasSlot = this.querySelectorAll('*').length > 0;
    return html`
      <div
        class="avatar"
        part="avatar"
        role=${this.name && !this.src ? 'img' : nothing}
        aria-label=${this.name && !this.src ? this.name : nothing}
      >
        ${this.src
          ? html`<img part="img" src=${this.src} alt=${this.imgAlt || this.name || ''} />`
          : hasSlot
          ? html`<slot></slot>`
          : html`<span part="initials" aria-hidden="true">${this._initials}</span>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-avatar': RrAvatar;
  }
}
