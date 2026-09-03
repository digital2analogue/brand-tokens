import { describe, it, expect, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import './segment.js';
import './segmented.js';
import type { RrSegment } from './segment.js';
import type { RrSegmented } from './segmented.js';

function createElement(markup: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  const el = tpl.content.firstElementChild as HTMLElement;
  document.body.appendChild(el);
  return el;
}

function createSegmented(value = 'approve'): RrSegmented {
  return createElement(`
    <rr-segmented label="Outcome" value="${value}">
      <rr-segment value="approve" tone="success">Approve</rr-segment>
      <rr-segment value="deny" tone="danger">Deny</rr-segment>
      <rr-segment value="review" disabled>Review</rr-segment>
    </rr-segmented>
  `) as RrSegmented;
}

async function settled(el: RrSegmented): Promise<RrSegmented> {
  await el.updateComplete;
  const segments = [...el.querySelectorAll('rr-segment')] as RrSegment[];
  await Promise.all(segments.map((s) => s.updateComplete));
  await el.updateComplete;
  return el;
}

const segmentsOf = (el: RrSegmented) => [...el.querySelectorAll('rr-segment')] as RrSegment[];
const indicator = (el: RrSegmented) => el.shadowRoot!.querySelector('.indicator');

describe('rr-segment', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders a button with role="radio"', async () => {
    const el = createElement('<rr-segment value="x">X</rr-segment>') as RrSegment;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[role="radio"]')).toBeTruthy();
  });

  it('reports aria-checked from selected', async () => {
    const el = createElement('<rr-segment value="x" selected>X</rr-segment>') as RrSegment;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[role="radio"]')!.getAttribute('aria-checked')).toBe('true');
  });

  it('fires rr-segment-select on click', async () => {
    const el = createElement('<rr-segment value="x">X</rr-segment>') as RrSegment;
    await el.updateComplete;
    let detail: { value: string } | null = null;
    el.addEventListener('rr-segment-select', (e) => { detail = (e as CustomEvent).detail; });
    el.shadowRoot!.querySelector('button')!.click();
    expect(detail).toEqual({ value: 'x' });
  });

  it('does not fire when already selected', async () => {
    const el = createElement('<rr-segment value="x" selected>X</rr-segment>') as RrSegment;
    await el.updateComplete;
    let fired = false;
    el.addEventListener('rr-segment-select', () => { fired = true; });
    el.shadowRoot!.querySelector('button')!.click();
    expect(fired).toBe(false);
  });

  it('does not fire when disabled', async () => {
    const el = createElement('<rr-segment value="x" disabled>X</rr-segment>') as RrSegment;
    await el.updateComplete;
    let fired = false;
    el.addEventListener('rr-segment-select', () => { fired = true; });
    el.shadowRoot!.querySelector('button')!.click();
    expect(fired).toBe(false);
  });
});

describe('rr-segmented', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders a radiogroup named by label', async () => {
    const el = await settled(createSegmented());
    const group = el.shadowRoot!.querySelector('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-label')).toBe('Outcome');
  });

  it('marks exactly the matching segment selected', async () => {
    const el = await settled(createSegmented('deny'));
    expect(segmentsOf(el).map((s) => s.selected)).toEqual([false, true, false]);
  });

  it('draws no indicator when nothing is chosen', async () => {
    const el = await settled(createSegmented(''));
    expect(indicator(el)).toBeNull();
  });

  it('draws the indicator once a value is chosen', async () => {
    const el = await settled(createSegmented(''));
    el.value = 'approve';
    await settled(el);
    expect(indicator(el)).toBeTruthy();
  });

  it('lifts the chosen segment tone onto the indicator', async () => {
    const el = await settled(createSegmented('deny'));
    expect(indicator(el)!.getAttribute('data-tone')).toBe('danger');
  });

  it('positions the indicator by segment index and count', async () => {
    const el = await settled(createSegmented('deny'));
    const track = el.shadowRoot!.querySelector('.track') as HTMLElement;
    expect(track.style.getPropertyValue('--rr-segment-count')).toBe('3');
    expect(track.style.getPropertyValue('--rr-segment-index')).toBe('1');
  });

  it('keeps one tab stop — the chosen segment', async () => {
    const el = await settled(createSegmented('deny'));
    expect(segmentsOf(el).map((s) => s.tabStop)).toEqual([false, true, false]);
  });

  // Roving tabindex must not strand an unanswered group outside the tab order.
  it('falls back to the first enabled segment as the tab stop when nothing is chosen', async () => {
    const el = await settled(createSegmented(''));
    expect(segmentsOf(el).map((s) => s.tabStop)).toEqual([true, false, false]);
  });

  it('commits a segment click and fires change', async () => {
    const el = await settled(createSegmented('approve'));
    let detail: { value: string } | null = null;
    el.addEventListener('change', (e) => { detail = (e as CustomEvent).detail; });
    segmentsOf(el)[1].shadowRoot!.querySelector('button')!.click();
    await settled(el);
    expect(el.value).toBe('deny');
    expect(detail).toEqual({ value: 'deny' });
  });

  it('moves and selects on ArrowRight, wrapping past disabled segments', async () => {
    const el = await settled(createSegmented('deny'));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settled(el);
    expect(el.value).toBe('approve');
  });

  it('moves and selects on ArrowLeft', async () => {
    const el = await settled(createSegmented('deny'));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await settled(el);
    expect(el.value).toBe('approve');
  });

  // With no current choice there is nothing to step from, so either direction
  // commits the first segment rather than doing nothing.
  it('commits the first segment from an unanswered state', async () => {
    const el = await settled(createSegmented(''));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await settled(el);
    expect(el.value).toBe('approve');
  });

  it('selects first and last on Home and End', async () => {
    const el = await settled(createSegmented('deny'));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await settled(el);
    expect(el.value).toBe('approve');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settled(el);
    expect(el.value).toBe('deny');
  });

  it('ignores keys it does not handle', async () => {
    const el = await settled(createSegmented('approve'));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await settled(el);
    expect(el.value).toBe('approve');
  });

  it('disables every segment when the group is disabled', async () => {
    const el = await settled(createSegmented('approve'));
    el.disabled = true;
    await settled(el);
    expect(segmentsOf(el).every((s) => s.disabled)).toBe(true);
  });

  it('ignores keyboard selection while disabled', async () => {
    const el = await settled(createSegmented('approve'));
    el.disabled = true;
    await settled(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settled(el);
    expect(el.value).toBe('approve');
  });

  it('has no axe violations', async () => {
    const el = await settled(createSegmented());
    expect(await axe(el)).toHaveNoViolations();
  });
});
