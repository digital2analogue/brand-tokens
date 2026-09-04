import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * `<rr-option>` — a single selectable value inside `<rr-listbox>`.
 *
 * The host carries `role="option"`, `aria-selected` and `tabindex="-1"`, so the
 * flattened tree reads as listbox → option; focus and roving order are managed
 * by the parent `rr-listbox`.
 *
 * Unlike a native `<option>`, this renders arbitrary content: a leading icon or
 * swatch, a label, and an optional description line. That richness is the whole
 * reason the listbox family exists alongside the form-associated `rr-select`.
 *
 * @slot - The option label
 * @slot leading - Icon, swatch or marker shown before the label
 * @slot description - Secondary line beneath the label
 *
 * @fires rr-option-select - Bubbles (composed) to rr-listbox when the option is
 *   activated; detail.value is this option's value. Not fired when disabled.
 *
 * @csspart option - The option row
 * @csspart leading - The leading icon/swatch wrapper
 * @csspart label - The label line
 * @csspart description - The secondary description line
 * @csspart check - The selected-state check mark
 */
@customElement('rr-option')
export class RrOption extends LitElement {
  static styles = css`
    :host {
      display: block;
      cursor: pointer;
      outline: none;
      border-radius: var(--radius-sm);
    }

    .option {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-tight);
      padding: var(--spacing-tight) var(--spacing-inline);
      border-radius: var(--radius-sm);
      color: var(--color-foreground-default);
      transition: background var(--motion-duration-instant) var(--motion-easing-default);
    }

    .text {
      flex: 1 1 auto;
      min-width: 0;
    }

    .label {
      display: block;
      font: var(--font-label-medium);
    }

    .description {
      display: block;
      margin-top: var(--spacing-align);
      font: var(--font-label-small);
      color: var(--color-foreground-muted);
    }

    .leading,
    .check {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-size-compact);
      height: var(--icon-size-compact);
    }

    .check svg {
      width: 100%;
      height: 100%;
    }

    /* The check keeps its box when unselected so rows do not shift width as
       the selection moves down the list. */
    :host(:not([selected])) .check {
      visibility: hidden;
    }

    :host([selected]) .option {
      color: var(--color-foreground-accent-green);
    }

    :host(:hover:not([disabled])) .option,
    :host(:focus) .option {
      background: var(--color-background-accent-green);
    }

    /* Options receive focus programmatically during keyboard navigation — an
       inset ring keeps the focused row visible inside the overlay. */
    :host(:focus) .option {
      box-shadow: inset 0 0 0 2px var(--color-border-focus);
    }

    :host([disabled]) {
      cursor: default;
    }

    :host([disabled]) .option {
      color: var(--color-foreground-disabled);
      background: none;
    }

    :host([disabled]) .description {
      color: var(--color-foreground-disabled);
    }
  `;

  /** Value reported in rr-listbox's rr-listbox-select event when this option is chosen. */
  @property() value = '';

  /** Whether this option is the listbox's current value. Set by the parent rr-listbox. */
  @property({ type: Boolean, reflect: true }) selected = false;

  /** Disables the option — skipped by keyboard navigation, click is inert. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  @state() private _hasLeading = false;

  @state() private _hasDescription = false;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'option');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
    this.addEventListener('click', this._onActivate);
    this.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onActivate);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  updated(changed: Map<PropertyKey, unknown>) {
    // aria-selected is present on EVERY option, not only the chosen one — a
    // listbox whose other options are silent reads as a list of buttons.
    if (changed.has('selected')) {
      this.setAttribute('aria-selected', String(this.selected));
    }
    if (changed.has('disabled')) {
      if (this.disabled) this.setAttribute('aria-disabled', 'true');
      else this.removeAttribute('aria-disabled');
    }
  }

  firstUpdated() {
    this.setAttribute('aria-selected', String(this.selected));
  }

  private _onActivate = () => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('rr-option-select', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      })
    );
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._onActivate();
    }
  };

  private _onLeadingSlotChange = (e: Event) => {
    this._hasLeading = (e.target as HTMLSlotElement).assignedNodes().length > 0;
  };

  private _onDescriptionSlotChange = (e: Event) => {
    this._hasDescription = (e.target as HTMLSlotElement).assignedNodes().length > 0;
  };

  render() {
    return html`
      <div class="option" part="option">
        <span class="leading" part="leading" ?hidden=${!this._hasLeading}>
          <slot name="leading" @slotchange=${this._onLeadingSlotChange}></slot>
        </span>
        <span class="text">
          <span class="label" part="label"><slot></slot></span>
          <span class="description" part="description" ?hidden=${!this._hasDescription}>
            <slot name="description" @slotchange=${this._onDescriptionSlotChange}></slot>
          </span>
        </span>
        <span class="check" part="check" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3.5 8.5l3 3 6-7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-option': RrOption;
  }
}
