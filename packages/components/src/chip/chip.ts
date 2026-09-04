import { LitElement, html, css, nothing } from 'lit';
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
 * bordered label. Content is rendered UPPERCASE with all-caps letter-spacing,
 * so authors pass normal-case text.
 *
 * **A chip keeps one silhouette in every mode.** Interactive or not, it is
 * `radius.sm` (owner's call, 2026-09-03). What changes is the *affordance*:
 * an operable chip earns the accent, a focus ring and Enter/Space, exactly as
 * hard rule 5 describes. A component that changed shape on a boolean would put
 * the same object in a design file under two outlines, and nobody reading a
 * mock could tell "this chip is interactive" from "someone used the wrong
 * radius".
 *
 * Four modes compose freely:
 *
 * - **static** (default) — no role, not focusable. A label.
 * - **`interactive`** — the body becomes a real `<button>`; click, Enter and
 *   Space all work, and `click` bubbles from the host.
 * - **`pressed`** — a latched filter chip (`aria-pressed`). Implies
 *   `interactive`. **Controlled, not self-toggling**: like `rr-tab[selected]`,
 *   the consumer owns the state and flips it on `click`.
 * - **`removable`** — a trailing dismiss button, a *sibling* of the body
 *   rather than a child, because a button inside a button is neither valid
 *   HTML nor a usable control. Fires `rr-chip-remove`.
 *
 * `empty` is the "nothing chosen yet" treatment for a chip used as a trigger:
 * a dashed edge and muted text. It must read as **awaiting input**, never as
 * disabled — so it stays fully operable and keeps a legible border, where
 * `disabled` recedes to near-canvas and stops accepting input.
 *
 * Used as a popup trigger, a chip **never declares `aria-haspopup` or
 * `aria-expanded` itself** — the popup stamps those onto whatever sits in its
 * trigger slot, as `rr-menu` already does (`menu.ts:148-149`). That is what
 * keeps one chip correct both as a trigger and as a plain filter.
 *
 * Uses semantic design tokens for all visual properties. Brand theming
 * cascades automatically via CSS custom properties on `:root`.
 *
 * @slot - Chip label text
 * @slot leading - Icon or marker before the label
 * @slot trailing - Icon or marker after the label (not the remove control)
 * @fires rr-chip-remove - The dismiss control was activated
 * @csspart chip - The outer chip container
 * @csspart body - The label body (a button when interactive)
 * @csspart remove - The dismiss control
 */
@customElement('rr-chip')
export class RrChip extends LitElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static styles = css`
    :host {
      display: inline-flex;
    }

    .chip {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-micro);
      white-space: nowrap;
      border-radius: var(--radius-sm);
      padding: var(--spacing-micro) var(--spacing-tight);
      border: 1px solid var(--color-foreground-muted);
      background: transparent;
      color: var(--color-foreground-alt);
      transition:
        background-color var(--motion-duration-instant) var(--motion-easing-default),
        border-color var(--motion-duration-instant) var(--motion-easing-default),
        color var(--motion-duration-instant) var(--motion-easing-default);
    }

    .body {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-micro);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-all-caps);
      font: var(--font-label-small);
      color: inherit;
    }

    :host([variant='subtle']) .chip {
      color: var(--color-foreground-muted);
      border-color: var(--color-border-elevated);
    }

    /* Interactive: the accent is the affordance, per hard rule 5. This is the
       secondary-button treatment (border.action + foreground.action) at chip
       scale, so an operable chip and an operable button read as one family. */
    :host([interactive]) .chip,
    :host([pressed]) .chip {
      border-color: var(--color-border-action);
      color: var(--color-foreground-action);
    }

    :host([interactive]) .body,
    :host([pressed]) .body {
      cursor: pointer;
    }

    :host([interactive]:not([disabled])) .chip:hover,
    :host([pressed]:not([disabled])) .chip:hover {
      background: var(--color-background-alt);
    }

    /* Latched. background.accent-green is the token for exactly this — its own
       description names subtle chip fills — and pairs with
       foreground.accent-green at 9.66:1. */
    :host([pressed]) .chip {
      background: var(--color-background-accent-green);
      color: var(--color-foreground-accent-green);
    }

    /* Awaiting input, NOT disabled: still operable, still a legible edge. The
       dashed rule is the whole signal, so it must not also recede. */
    :host([empty]) .chip {
      border-style: dashed;
      border-color: var(--color-border-default);
      color: var(--color-foreground-muted);
      background: transparent;
    }

    :host([empty][interactive]:not([disabled])) .chip:hover {
      border-color: var(--color-border-action);
      color: var(--color-foreground-action);
      background: var(--color-background-alt);
    }

    .body:focus-visible,
    .remove:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-border-focus);
      border-radius: var(--radius-sm);
    }

    .remove {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--color-foreground-muted);
      transition: color var(--motion-duration-instant) var(--motion-easing-default);
    }

    .remove:hover {
      color: var(--color-foreground-default);
    }

    .remove svg {
      width: var(--icon-size-compact);
      height: var(--icon-size-compact);
    }

    :host([disabled]) .chip {
      background: var(--color-background-disabled);
      color: var(--color-foreground-disabled);
      border-color: var(--color-border-disabled);
      border-style: solid;
    }

    :host([disabled]) .body,
    :host([disabled]) .remove {
      color: var(--color-foreground-disabled);
      cursor: not-allowed;
      pointer-events: none;
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

  /**
   * Makes the chip body a real button — focusable, with Enter and Space. The
   * accent border and label come with it. Reflected.
   */
  @property({ type: Boolean, reflect: true })
  interactive = false;

  /**
   * Latched state for a filter chip; sets aria-pressed and fills the chip.
   * Implies interactive. Controlled by the consumer — the chip does not toggle
   * itself, so flip it on the click event. Reflected.
   */
  @property({ type: Boolean, reflect: true })
  pressed = false;

  /**
   * Adds a trailing dismiss control that fires rr-chip-remove. Independent of
   * interactive: a static value chip can be removable. Reflected.
   */
  @property({ type: Boolean, reflect: true })
  removable = false;

  /**
   * Renders the awaiting-input treatment — dashed edge, muted label — for a
   * chip acting as a trigger with nothing chosen yet. Distinct from disabled:
   * an empty chip is still operable. Reflected.
   */
  @property({ type: Boolean, reflect: true })
  empty = false;

  /** Disables the chip body and its dismiss control. Reflected. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * Accessible name for the dismiss control. Name the thing being removed
   * ("Remove Income filter") — a row of chips all saying "Remove" tells a
   * screen-reader user nothing. Maps to attribute remove-label.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove';

  /** True when the body should render as a button. `pressed` implies it. */
  private get _operable(): boolean {
    return this.interactive || this.pressed;
  }

  private _onRemove = (e: Event) => {
    // The dismiss control sits inside the chip, so its click would otherwise
    // also read as a click on the chip itself.
    e.stopPropagation();
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('rr-chip-remove', { bubbles: true, composed: true }));
  };

  private _label() {
    return html`<slot name="leading"></slot><slot></slot><slot name="trailing"></slot>`;
  }

  render() {
    return html`
      <span class="chip" part="chip">
        ${this._operable
          ? html`<button
              class="body"
              part="body"
              aria-pressed=${this.pressed ? 'true' : nothing}
              ?disabled=${this.disabled}
            >
              ${this._label()}
            </button>`
          : html`<span class="body" part="body">${this._label()}</span>`}
        ${this.removable
          ? html`<button
              class="remove"
              part="remove"
              aria-label=${this.removeLabel}
              ?disabled=${this.disabled}
              @click=${this._onRemove}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4.5 4.5l7 7m0-7l-7 7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>`
          : nothing}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-chip': RrChip;
  }
}
