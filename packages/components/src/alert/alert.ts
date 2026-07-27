import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

/**
 * An inline notification banner for success, warning, danger, and info messages.
 *
 * Use for form-level feedback, async status messages, and system notifications.
 * For field-level validation errors, use `<rr-input error-text="...">` instead.
 *
 * @slot - Alert body content
 * @slot icon - Optional icon in front of the heading (use <rr-icon>)
 * @fires close - When the dismiss button is clicked (only fires when dismissible)
 * @csspart alert - The root alert element
 * @csspart heading - The heading text element
 * @csspart content - The content slot wrapper
 * @csspart dismiss - The dismiss button
 */
@customElement('rr-alert')
export class RrAlert extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    :host([hidden]) {
      display: none;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-tight);
      padding: var(--spacing-inline) var(--spacing-element);
      border-radius: var(--radius-default);
      border: 1px solid var(--color-background-success-alt);
      background: var(--color-background-success-alt);
      color: var(--color-foreground-success);
    }

    /* Variant: warning */
    :host([variant='warning']) .alert {
      border-color: var(--color-background-warning-alt);
      background: var(--color-background-warning-alt);
      color: var(--color-foreground-warning);
    }

    /* Variant: danger */
    :host([variant='danger']) .alert {
      border-color: var(--color-background-danger-alt);
      background: var(--color-background-danger-alt);
      color: var(--color-foreground-danger);
    }

    /* Variant: info */
    :host([variant='info']) .alert {
      border-color: var(--color-background-info-alt);
      background: var(--color-background-info-alt);
      color: var(--color-foreground-info);
    }

    .body {
      flex: 1;
      min-width: 0;
    }

    .heading {
      font: var(--font-label-strong-medium);
      margin: 0 0 2px;
    }

    .content {
      font: var(--font-body-medium);
    }

    /* Icon slot */
    ::slotted([slot='icon']) {
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Dismiss button */
    .dismiss {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: currentColor;
      padding: 2px;
      border-radius: var(--radius-sm);
      opacity: 0.7;
      transition: opacity var(--motion-duration-instant) var(--motion-easing-default);
      margin-top: -1px;
      margin-right: -4px;
    }

    .dismiss:hover {
      opacity: 1;
    }

    .dismiss:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      opacity: 1;
    }
  `;

  /** Visual variant and semantic role. */
  @property({ reflect: true }) variant: AlertVariant = 'success';
  /** Optional bold heading rendered above the body content. */
  @property() heading = '';
  /** When true, renders a dismiss button that hides the alert and fires close. */
  @property({ type: Boolean, reflect: true }) dismissible = false;

  @state() private _dismissed = false;

  private _dismiss() {
    this._dismissed = true;
    this.dispatchEvent(new Event('close', { bubbles: true, composed: true }));
    this.setAttribute('hidden', '');
  }

  /** Reshow the alert after it has been dismissed. */
  show() {
    this._dismissed = false;
    this.removeAttribute('hidden');
  }

  render() {
    if (this._dismissed) return nothing;

    return html`
      <div class="alert" part="alert" role="alert">
        <slot name="icon"></slot>
        <div class="body">
          ${this.heading
            ? html`<p class="heading" part="heading">${this.heading}</p>`
            : nothing}
          <div class="content" part="content"><slot></slot></div>
        </div>
        ${this.dismissible
          ? html`
            <button
              class="dismiss"
              part="dismiss"
              aria-label="Dismiss"
              @click=${this._dismiss}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-alert': RrAlert;
  }
}
