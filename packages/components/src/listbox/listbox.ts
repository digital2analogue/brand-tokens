import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RrOption } from './option.js';

export type ListboxPlacement = 'bottom-start' | 'bottom-end';

/**
 * `<rr-listbox>` — a selection popover (WAI-ARIA listbox pattern).
 *
 * Slot any control into the `trigger` slot and `<rr-option>` elements into the
 * default slot. The component owns the open state, trigger ARIA wiring
 * (aria-haspopup / aria-expanded), outside-click and Escape dismissal, and full
 * keyboard navigation: ArrowDown/ArrowUp move through enabled options
 * (wrapping), Home/End jump, Enter/Space choose, Escape closes and returns
 * focus to the trigger.
 *
 * It is the selection counterpart to `rr-menu`. A menu fires commands and
 * nothing latches; a listbox sets a value and the chosen option stays marked.
 * Opening focuses the CURRENT value rather than the first option, so reopening
 * a listbox puts you where you already are.
 *
 * `value` is owned by the component and settable for controlled usage — the
 * widget is the state container for its own single value.
 *
 * @slot trigger - The control that opens the listbox (an rr-chip)
 * @slot - Place `<rr-option>` elements here
 *
 * @fires rr-listbox-select - When an option is chosen; detail: { value: string }
 * @fires rr-listbox-toggle - When the listbox opens or closes; detail: { open: boolean }
 *
 * @csspart listbox - The floating listbox surface
 *
 * @example
 * <rr-listbox label="Attribute" value="income">
 *   <rr-chip slot="trigger" interactive>Income</rr-chip>
 *   <rr-option value="income">Income</rr-option>
 *   <rr-option value="tenure">Tenure<span slot="description">Months at address</span></rr-option>
 * </rr-listbox>
 */
@customElement('rr-listbox')
export class RrListbox extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    .listbox {
      position: absolute;
      top: calc(100% + var(--spacing-micro));
      left: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      min-width: 220px;
      padding: var(--spacing-micro);
      background: var(--color-background-alt);
      border: 1px solid var(--color-border-elevated);
      border-radius: var(--radius-default);
      box-shadow: var(--shadow-overlay);
    }

    .listbox[hidden] {
      display: none;
    }

    :host([placement='bottom-end']) .listbox {
      left: auto;
      right: 0;
    }
  `;

  /** Whether the listbox is open. Usually driven by the component itself; settable for controlled usage. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Which edge of the trigger the listbox aligns to: bottom-start (default) or bottom-end. */
  @property({ reflect: true }) placement: ListboxPlacement = 'bottom-start';

  /** Accessible label for the listbox popup (required); sets aria-label on the role=listbox element. */
  @property() label = '';

  /** The chosen option's value. Owned by the component; set it to control the selection. */
  @property({ reflect: true }) value = '';

  private _trigger: HTMLElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('rr-option-select', this._onOptionSelect as EventListener);
    this.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('rr-option-select', this._onOptionSelect as EventListener);
    this.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('pointerdown', this._onOutsidePointerDown);
  }

  updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('value')) this._syncSelected();

    if (changed.has('open')) {
      this._trigger?.setAttribute('aria-expanded', String(this.open));
      if (this.open) {
        document.addEventListener('pointerdown', this._onOutsidePointerDown);
      } else {
        document.removeEventListener('pointerdown', this._onOutsidePointerDown);
      }
      // Fire only on real transitions, not the initial false → false render
      if (changed.get('open') !== undefined || this.open) {
        this.dispatchEvent(
          new CustomEvent('rr-listbox-toggle', {
            bubbles: true,
            composed: true,
            detail: { open: this.open },
          })
        );
      }
    }
  }

  /** Open the listbox, moving focus to the selected option (or the first when nothing is chosen). */
  show(focusOption = true) {
    this.open = true;
    if (!focusOption) return;
    requestAnimationFrame(() => {
      const options = this._options();
      const current = options.find((o) => o.value === this.value);
      (current ?? options[0])?.focus();
    });
  }

  /** Close the listbox and return focus to the trigger. */
  hide(refocusTrigger = true) {
    if (!this.open) return;
    this.open = false;
    if (refocusTrigger) this._trigger?.focus();
  }

  private _allOptions(): RrOption[] {
    return [...this.querySelectorAll('rr-option')] as RrOption[];
  }

  private _options(): RrOption[] {
    return this._allOptions().filter((o) => !o.disabled);
  }

  private _syncSelected() {
    for (const option of this._allOptions()) {
      option.selected = option.value === this.value;
    }
  }

  private _onSlotChange = () => {
    this._syncSelected();
  };

  private _onTriggerSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    const el = slot.assignedElements()[0] as HTMLElement | undefined;
    if (this._trigger && this._trigger !== el) {
      this._trigger.removeEventListener('click', this._onTriggerClick);
    }
    this._trigger = el ?? null;
    if (this._trigger) {
      this._trigger.setAttribute('aria-haspopup', 'listbox');
      this._trigger.setAttribute('aria-expanded', String(this.open));
      this._trigger.addEventListener('click', this._onTriggerClick);
    }
  };

  private _onTriggerClick = () => {
    if (this.open) this.hide(false);
    else this.show(false);
  };

  private _onOutsidePointerDown = (e: Event) => {
    if (!e.composedPath().includes(this)) this.hide(false);
  };

  private _onOptionSelect = (e: CustomEvent<{ value: string }>) => {
    e.stopPropagation();
    this.value = e.detail.value;
    this._syncSelected();
    this.hide();
    this.dispatchEvent(
      new CustomEvent('rr-listbox-select', {
        bubbles: true,
        composed: true,
        detail: { value: e.detail.value },
      })
    );
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    const fromTrigger =
      this._trigger !== null && e.composedPath().includes(this._trigger);

    if (!this.open) {
      // ArrowDown/ArrowUp on the trigger open the listbox on the current value
      if (fromTrigger && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        this.show();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
      return;
    }
    if (e.key === 'Tab') {
      // Listboxes close on Tab — focus proceeds naturally from the trigger
      this.hide(false);
      return;
    }

    const options = this._options();
    if (options.length === 0) return;
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    const current = options.findIndex((o) => o === active);
    let next = -1;

    switch (e.key) {
      case 'ArrowDown':
        next = current < 0 ? 0 : (current + 1) % options.length;
        break;
      case 'ArrowUp':
        next = current < 0 ? options.length - 1 : (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    options[next].focus();
  };

  render() {
    return html`
      <slot name="trigger" @slotchange=${this._onTriggerSlotChange}></slot>
      <div
        class="listbox"
        part="listbox"
        role="listbox"
        aria-label=${this.label}
        ?hidden=${!this.open}
      >
        <slot @slotchange=${this._onSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-listbox': RrListbox;
  }
}
