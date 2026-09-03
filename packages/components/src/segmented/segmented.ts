import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { RrSegment, SegmentTone } from './segment.js';

/**
 * `<rr-segmented>` — a segmented control: a field whose two or three choices
 * are all visible at rest.
 *
 * It does the same job as a listbox — **set a field's value** — but spends
 * screen space instead of a click. That trade only pays at two or three
 * options; past that it stops fitting and the choice belongs behind a click.
 *
 * The tell that it is a field and not a row of buttons: `role="radiogroup"` /
 * `role="radio"`, exactly one choice checked, and a value that survives the
 * interaction. A menu, by contrast, latches nothing.
 *
 * **The sliding pill is the whole design.** One absolutely-positioned
 * indicator carries the fill, border and shadow and translates between
 * segments; the segments themselves carry only semantic text colour. Segments
 * are equal-width — one `1fr` grid column each, so every segment is as wide as
 * the widest label — which is what lets the indicator be placed arithmetically
 * rather than measured.
 *
 * With no value set, **no indicator is drawn at all** — a draft row that has
 * not been answered must not look like it picked the first option.
 *
 * @slot - Place `<rr-segment>` elements here
 * @fires change - When the value changes; detail: { value: string }
 * @csspart track - The outer track element
 * @csspart indicator - The sliding pill
 *
 * @example
 * <rr-segmented label="Outcome" value="approve">
 *   <rr-segment value="approve" tone="success">Approve</rr-segment>
 *   <rr-segment value="deny" tone="danger">Deny</rr-segment>
 * </rr-segmented>
 */
@customElement('rr-segmented')
export class RrSegmented extends LitElement {
  static styles = css`
    /* --rr-segment-* are component knobs, not design tokens: the parent writes
       them onto the track, and the defaults here keep the control laid out
       before the first slotchange. */
    :host {
      --rr-segment-count: 1;
      --rr-segment-index: 0;
      display: inline-block;
    }

    /* Grid, not flex: 1fr is minmax(auto, 1fr), so every column is the width of
       the widest segment and none can shrink below its own label. Equal columns
       are what let the indicator be placed arithmetically; a flex-basis of 0
       gave equal columns too, but clipped the longest label to get them. */
    .track {
      box-sizing: border-box;
      position: relative;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      padding: var(--spacing-align);
      border-radius: var(--radius-default);
      background: var(--color-background-default);
      border: 1px solid var(--color-border-elevated);
    }

    /* Sliding pill. Sits under the segments (z-index 0) so their focus rings
       and labels stay on top; percentage width resolves against the track's
       padding box, so one segment's width is (content width / count). */
    .indicator {
      box-sizing: border-box;
      position: absolute;
      top: var(--spacing-align);
      left: var(--spacing-align);
      width: calc((100% - 2 * var(--spacing-align)) / var(--rr-segment-count));
      height: calc(100% - 2 * var(--spacing-align));
      border-radius: var(--radius-sm);
      background: var(--color-background-alt);
      border: 1px solid var(--color-border-default);
      box-shadow: var(--shadow-raised);
      transform: translateX(calc(var(--rr-segment-index) * 100%));
      /* Overshoot would read better here — the pill should feel moved rather
         than recoloured — but the system has no spring curve yet, so this is
         motion-easing-move by fallback (see #232). */
      transition:
        transform var(--motion-duration-standard) var(--motion-easing-move),
        background-color var(--motion-duration-standard) var(--motion-easing-default),
        border-color var(--motion-duration-standard) var(--motion-easing-default);
      pointer-events: none;
      z-index: 0;
    }

    /* Semantic tint on the active pill. Mixed rather than solid: a filled
       success pill would fight the label sitting on it, and the point is to
       make the chosen value scannable down a column, not to shout. */
    .indicator[data-tone='success'] {
      background: color-mix(in srgb, var(--color-background-success) 12%, var(--color-background-alt));
      border-color: color-mix(in srgb, var(--color-background-success) 30%, var(--color-border-default));
    }

    .indicator[data-tone='danger'] {
      background: color-mix(in srgb, var(--color-background-danger) 12%, var(--color-background-alt));
      border-color: color-mix(in srgb, var(--color-background-danger) 30%, var(--color-border-default));
    }

    :host([disabled]) .track {
      border-color: var(--color-border-disabled);
    }

    :host([disabled]) .indicator {
      background: var(--color-background-disabled);
      border-color: var(--color-border-disabled);
      box-shadow: none;
    }
  `;

  /** Accessible label for the group (required); sets aria-label on the radiogroup. */
  @property() label = '';

  /** The chosen segment's value. Empty means nothing is chosen and no indicator is drawn. Reflected. */
  @property({ reflect: true }) value = '';

  /** Disables the whole group and every segment in it. Reflected. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('rr-segment-select', this._onSegmentSelect as EventListener);
    this.addEventListener('keydown', this._onKeyDown);
    this._syncSegments();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('rr-segment-select', this._onSegmentSelect as EventListener);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('value') || changed.has('disabled')) this._syncSegments();
  }

  private _segments(): RrSegment[] {
    return [...this.querySelectorAll('rr-segment')] as RrSegment[];
  }

  /** Index of the chosen segment among all of them, or -1 when nothing is chosen. */
  private get _selectedIndex(): number {
    return this._segments().findIndex((s) => s.value === this.value && this.value !== '');
  }

  private _syncSegments = () => {
    const segments = this._segments();
    const selected = this._selectedIndex;
    // Roving tabindex: the group is one tab stop. With nothing chosen the
    // first enabled segment is the entry point, so an unanswered control
    // never drops out of the tab order.
    const fallback = segments.findIndex((s) => !s.disabled);
    const tabStop = selected >= 0 ? selected : fallback;
    segments.forEach((segment, i) => {
      segment.selected = i === selected;
      segment.tabStop = i === tabStop;
      if (this.disabled) segment.disabled = true;
    });
    this.requestUpdate();
  };

  private _commit(value: string) {
    const prev = this.value;
    this.value = value;
    this._syncSegments();
    if (prev !== value) {
      this.dispatchEvent(
        new CustomEvent('change', { bubbles: true, composed: true, detail: { value } })
      );
    }
  }

  private _onSegmentSelect = (e: CustomEvent<{ value: string }>) => {
    e.stopPropagation();
    if (this.disabled) return;
    this._commit(e.detail.value);
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    const segments = this._segments().filter((s) => !s.disabled);
    if (segments.length === 0) return;

    const current = segments.findIndex((s) => s.value === this.value && this.value !== '');
    let next = -1;

    switch (e.key) {
      // Arrows move AND select — the WAI-ARIA radio group pattern. With
      // nothing chosen yet there is no "current", so either direction commits
      // the first segment rather than doing nothing.
      case 'ArrowRight':
      case 'ArrowDown':
        next = current < 0 ? 0 : (current + 1) % segments.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current < 0 ? 0 : (current - 1 + segments.length) % segments.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = segments.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const target = segments[next];
    this._commit(target.value);
    // Selection follows focus, so focus lands on the segment just checked.
    (target as HTMLElement).focus();
  };

  render() {
    const selected = this._selectedIndex;
    const segments = this._segments();
    const tone: SegmentTone | undefined =
      selected >= 0 ? (segments[selected].tone ?? 'neutral') : undefined;

    return html`
      <div
        class="track"
        part="track"
        role="radiogroup"
        aria-label="${this.label}"
        aria-disabled="${this.disabled ? 'true' : nothing}"
        style=${styleMap({
          '--rr-segment-count': String(Math.max(segments.length, 1)),
          '--rr-segment-index': String(Math.max(selected, 0)),
        })}
      >
        ${selected >= 0
          ? html`<div class="indicator" part="indicator" data-tone=${tone ?? 'neutral'}></div>`
          : nothing}
        <slot @slotchange=${this._syncSegments}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rr-segmented': RrSegmented;
  }
}
