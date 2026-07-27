import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RrRadio } from './radio.js';

/**
 * A form-associated group of radio buttons.
 *
 * Manages selection state and form participation for its `<rr-radio>` children.
 * Renders a `<fieldset>` + `<legend>` for accessible grouping.
 *
 * Usage:
 *   <rr-radio-group name="size" label="Size" value="md">
 *     <rr-radio value="sm">Small</rr-radio>
 *     <rr-radio value="md">Medium</rr-radio>
 *     <rr-radio value="lg">Large</rr-radio>
 *   </rr-radio-group>
 *
 * @slot - rr-radio elements
 * @fires change - When the selected value changes
 * @csspart fieldset - The outer fieldset element
 * @csspart legend - The legend / label element
 */
@customElement('rr-radio-group')
export class RrRadioGroup extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: block;
    }

    fieldset {
      border: none;
      margin: 0;
      padding: 0;
    }

    legend {
      display: block;
      font: var(--font-label-medium);
      color: var(--color-foreground-alt);
      margin-bottom: var(--spacing-tight);
      padding: 0;
      float: none;
      width: 100%;
    }

    :host([disabled]) legend {
      color: var(--color-foreground-disabled);
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-tight);
    }

    :host([orientation='horizontal']) .options {
      flex-direction: row;
      gap: var(--spacing-element);
      flex-wrap: wrap;
    }

    .error {
      font: var(--font-label-small);
      color: var(--color-foreground-danger);
      margin-top: 4px;
    }
  `;

  /** Form field name submitted with the selected value. */
  @property() name = '';
  /** Selected radio value. Syncs the checked state of child radios. */
  @property({ reflect: true }) value = '';
  /** Group label rendered as the legend. */
  @property() label = '';
  /** Error message; sets data-invalid and a custom validity. Maps to attribute error-text. */
  @property({ attribute: 'error-text' }) errorText = '';
  /** Marks the group as required. */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Disables the group and all child radios. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Layout direction of the radio options. */
  @property({ reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('rr-radio-change', this._onRadioChange as EventListener);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('rr-radio-change', this._onRadioChange as EventListener);
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('disabled')) {
      this._syncRadios();
    }
    if (changed.has('value')) {
      this._internals.setFormValue?.(this.value || null);
    }
    if (changed.has('errorText')) {
      if (this.errorText) {
        this.setAttribute('data-invalid', '');
        this._internals.setValidity?.({ customError: true }, this.errorText);
      } else {
        this.removeAttribute('data-invalid');
        this._internals.setValidity?.({});
      }
    }
  }

  override firstUpdated() {
    this._syncRadios();
    this._internals.setFormValue?.(this.value || null);
  }

  private _syncRadios() {
    for (const radio of this._radios) {
      radio.checked = radio.value === this.value;
      if (this.disabled) radio.disabled = true;
    }
  }

  private get _radios(): RrRadio[] {
    return Array.from(this.querySelectorAll('rr-radio')) as RrRadio[];
  }

  private _onRadioChange = (e: CustomEvent<{ value: string }>) => {
    const prev = this.value;
    this.value = e.detail.value;
    this._internals.setFormValue?.(this.value);
    this._syncRadios();
    if (prev !== this.value) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  };

  render() {
    return html`
      <fieldset part="fieldset" ?disabled=${this.disabled}>
        ${this.label
          ? html`<legend part="legend">${this.label}${this.required
              ? html`<span aria-hidden="true" style="color:var(--color-foreground-danger);margin-left:2px">*</span>`
              : nothing}
            </legend>`
          : nothing}
        <div class="options" role="radiogroup" aria-required=${this.required ? 'true' : nothing}>
          <slot></slot>
        </div>
        ${this.errorText
          ? html`<div class="error" role="alert">${this.errorText}</div>`
          : nothing}
      </fieldset>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-radio-group': RrRadioGroup;
  }
}
