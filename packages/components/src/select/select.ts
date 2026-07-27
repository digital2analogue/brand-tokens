import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/**
 * A form-associated select dropdown with label, helper text, and error state.
 *
 * Pass options via the `options` property (array of `{ value, label, disabled? }`).
 * Uses `ElementInternals` for native form participation and `delegatesFocus`
 * so the host forwards focus to the inner `<select>`.
 *
 * Reuses the input’s semantic token recipe — it covers
 * text input, textarea, and select (see tokens/components/input.tokens.json).
 *
 * @fires change - When the selected value changes
 * @csspart label - The label element
 * @csspart select - The inner select element
 * @csspart helper - The helper text container
 * @csspart error - The error message container
 */
@customElement('rr-select')
export class RrSelect extends LitElement {
  static formAssociated = true;

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = css`
    :host {
      display: block;
    }

    label {
      display: block;
      font: var(--font-label-medium);
      color: var(--color-foreground-alt);
      margin-bottom: 4px;
    }

    .required {
      color: var(--color-foreground-danger);
      margin-left: 2px;
    }

    .wrapper {
      position: relative;
    }

    select {
      display: block;
      width: 100%;
      box-sizing: border-box;
      font: var(--font-body-large);
      color: var(--color-foreground-default);
      background: var(--color-background-default);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-sm);
      padding: var(--spacing-tight) var(--spacing-element);
      padding-right: 36px;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      transition: border-color var(--motion-duration-instant) var(--motion-easing-default);
    }

    select:hover {
      border-color: var(--color-border-hover);
    }

    select:focus {
      border-color: var(--color-border-focus);
      box-shadow: 0 0 0 1px var(--color-border-focus);
    }

    .arrow {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--color-foreground-alt);
      display: flex;
      align-items: center;
    }

    :host([disabled]) select {
      background: var(--color-background-alt);
      border-color: var(--color-border-disabled);
      color: var(--color-foreground-disabled);
      cursor: not-allowed;
    }

    :host([disabled]) label {
      color: var(--color-foreground-disabled);
    }

    :host([disabled]) .arrow {
      color: var(--color-foreground-disabled);
    }

    :host([data-invalid]) select {
      border-color: var(--color-foreground-danger);
    }

    :host([data-invalid]) select:focus {
      box-shadow: 0 0 0 1px var(--color-foreground-danger);
    }

    .helper {
      font: var(--font-label-small);
      color: var(--color-foreground-muted);
      margin-top: 4px;
    }

    .error {
      font: var(--font-label-small);
      color: var(--color-foreground-danger);
      margin-top: 4px;
    }
  `;

  /** Form field name submitted with the selected value. */
  @property() name = '';
  /** Selected option value. */
  @property({ reflect: true }) value = '';
  /** Field label rendered above the select. */
  @property() label = '';
  /** Helper text shown when there is no error. Maps to attribute helper-text. */
  @property({ attribute: 'helper-text' }) helperText = '';
  /** Error message; sets data-invalid and a custom validity. Maps to attribute error-text. */
  @property({ attribute: 'error-text' }) errorText = '';
  /** Marks the field as required and shows an asterisk. */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Disables the select. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Options to render: array of { value: string; label: string; disabled?: boolean }. */
  @property({ type: Array }) options: SelectOption[] = [];

  @query('select') private _select!: HTMLSelectElement;

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  private get _isInvalid(): boolean {
    return this.errorText.length > 0;
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('value')) {
      this._internals.setFormValue?.(this.value);
    }
    // Sync the native select's displayed selection with `value`. There is no
    // template binding for this — a `.value` binding on <select> commits
    // before the <option> children render and silently no-ops — and `options`
    // often arrive after the element upgrades. Only applied when `value`
    // matches a real option; otherwise the native select keeps its own
    // selection.
    if (changed.has('value') || changed.has('options')) {
      if (
        this._select &&
        this._select.value !== this.value &&
        this.options.some(o => o.value === this.value)
      ) {
        this._select.value = this.value;
      }
    }
    if (changed.has('errorText')) {
      if (this._isInvalid) {
        this.setAttribute('data-invalid', '');
        this._internals.setValidity?.(
          { customError: true },
          this.errorText,
          this._select
        );
      } else {
        this.removeAttribute('data-invalid');
        this._internals.setValidity?.({});
      }
    }
  }

  private _onChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.value = select.value;
    this._internals.setFormValue?.(this.value);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  render() {
    const hasLabel = this.label.length > 0;
    const describedBy = this._isInvalid ? 'error' : this.helperText ? 'helper' : undefined;

    return html`
      ${hasLabel
        ? html`<label part="label" for="select">
            ${this.label}${this.required
              ? html`<span class="required" aria-hidden="true">*</span>`
              : nothing}
          </label>`
        : nothing}
      <div class="wrapper">
        <select
          part="select"
          id="select"
          .name=${this.name}
          .disabled=${this.disabled}
          .required=${this.required}
          aria-required=${this.required ? 'true' : nothing}
          aria-invalid=${this._isInvalid ? 'true' : nothing}
          aria-errormessage=${this._isInvalid ? 'error' : nothing}
          aria-describedby=${describedBy || nothing}
          @change=${this._onChange}
        >
          ${this.options.map(
            opt => html`
              <option value=${opt.value} ?disabled=${opt.disabled ?? false}>
                ${opt.label}
              </option>
            `
          )}
        </select>
        <span class="arrow" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
      ${this.helperText && !this._isInvalid
        ? html`<div id="helper" part="helper" class="helper">${this.helperText}</div>`
        : nothing}
      ${this._isInvalid
        ? html`<div id="error" part="error" class="error" role="alert">${this.errorText}</div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-select': RrSelect;
  }
}
