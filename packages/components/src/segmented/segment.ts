import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type SegmentTone = 'neutral' | 'success' | 'danger';

/**
 * `<rr-segment>` — one choice inside `<rr-segmented>`.
 *
 * Selection state is owned by the parent: it sets `selected` and `tab-stop`,
 * and it draws the sliding indicator. **A segment paints no chrome of its
 * own** — no fill, no border, no shadow — only its label colour. That is the
 * whole reason this is a component rather than a row of chips: two segments
 * that each drew their own box would read as two adjacent buttons, not as one
 * field with one value.
 *
 * `tone` colours the label when this segment is the selected one, and the
 * parent lifts the same tone onto the indicator so the pill is tinted to
 * match. It is how an outcome stays scannable down a column of many rows.
 *
 * The set is deliberately only `success` and `danger` beside `neutral`: this
 * control holds two or three choices, so the only colour-coding it can carry
 * is a binary verdict — approve/deny, pass/fail, on/off. `warning` and `info`
 * are message roles; they describe something the system is telling you, not a
 * choice someone made, and offering them here just invites arbitrary colour.
 *
 * @slot - Segment label text (and optional leading icon)
 * @fires rr-segment-select - Bubbles to rr-segmented when clicked; detail.value
 */
@customElement('rr-segment')
export class RrSegment extends LitElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static styles = css`
    /* Flex, not block-plus-percentage: the host is a grid item of the track,
       and a button sized with width:100% contributes nothing to the column's
       min-content, so the widest label lost its padding. As a flex item the
       button contributes its real intrinsic width. */
    :host {
      display: flex;
      position: relative;
      z-index: 1;
    }

    button {
      all: unset;
      box-sizing: border-box;
      flex: 1 1 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-micro);
      padding: var(--spacing-micro) var(--spacing-inline);
      border-radius: var(--radius-sm);
      font: var(--font-label-small);
      letter-spacing: var(--letter-spacing-label);
      white-space: nowrap;
      cursor: pointer;
      color: var(--color-foreground-muted);
      transition: color var(--motion-duration-standard) var(--motion-easing-default);
    }

    button:hover {
      color: var(--color-foreground-alt);
    }

    /* Inset ring: the segment sits inside the track's rounded, clipped edge,
       so an outset outline would be cropped by the container. */
    button:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--color-border-focus);
    }

    /* Selected segments carry semantic colour and nothing else — the
       indicator owns the fill, border and shadow. A weight swap here would
       also be a reflow on every selection change. */
    :host([selected]) button,
    :host([selected]) button:hover {
      color: var(--color-foreground-default);
    }

    :host([selected][tone='success']) button,
    :host([selected][tone='success']) button:hover {
      color: var(--color-foreground-success);
    }

    :host([selected][tone='danger']) button,
    :host([selected][tone='danger']) button:hover {
      color: var(--color-foreground-danger);
    }

    :host([disabled]) button,
    :host([disabled]) button:hover {
      color: var(--color-foreground-disabled);
      cursor: not-allowed;
      pointer-events: none;
    }
  `;

  /** The value this segment commits to the group when chosen. Reflected. */
  @property({ reflect: true }) value = '';

  /** Marks the chosen segment. Set by the parent rr-segmented — do not set directly. Reflected. */
  @property({ type: Boolean, reflect: true }) selected = false;

  /** Prevents selection and skips this segment during arrow navigation. Reflected. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /**
   * Semantic colour this choice carries once selected — the label takes the
   * matching foreground and the parent tints the indicator to match. Reflected.
   */
  @property({ reflect: true }) tone: SegmentTone = 'neutral';

  /**
   * Marks this segment as the group's single tab stop (roving tabindex). Set
   * by the parent rr-segmented — do not set directly. Maps to attribute tab-stop.
   */
  @property({ type: Boolean, reflect: true, attribute: 'tab-stop' }) tabStop = false;

  private _handleClick() {
    if (this.disabled || this.selected) return;
    this.dispatchEvent(
      new CustomEvent('rr-segment-select', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      })
    );
  }

  render() {
    return html`
      <button
        role="radio"
        aria-checked="${this.selected ? 'true' : 'false'}"
        tabindex="${this.tabStop ? 0 : -1}"
        ?disabled="${this.disabled}"
        @click="${this._handleClick}"
      >
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-segment': RrSegment;
  }
}
