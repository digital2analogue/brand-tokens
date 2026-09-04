import { describe, it, expect, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import './listbox.js';
import './option.js';
import type { RrListbox } from './listbox.js';
import type { RrOption } from './option.js';

function mount(value = ''): RrListbox {
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <rr-listbox label="Attribute" ${value ? `value="${value}"` : ''}>
      <button slot="trigger">Attribute</button>
      <rr-option value="income">Income</rr-option>
      <rr-option value="tenure">Tenure<span slot="description">Months at address</span></rr-option>
      <rr-option value="legacy" disabled>Legacy score</rr-option>
      <rr-option value="score">Credit score</rr-option>
    </rr-listbox>
  `.trim();
  const el = tpl.content.firstElementChild as RrListbox;
  document.body.appendChild(el);
  return el;
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

function key(target: Element, k: string) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));
}

describe('rr-listbox', () => {
  let listbox: RrListbox;
  let trigger: HTMLButtonElement;
  let options: RrOption[];

  beforeEach(async () => {
    document.body.innerHTML = '';
    listbox = mount();
    await listbox.updateComplete;
    trigger = listbox.querySelector('button')!;
    options = [...listbox.querySelectorAll('rr-option')] as RrOption[];
    await Promise.all(options.map((o) => o.updateComplete));
  });

  it('starts closed with the popup hidden', () => {
    expect(listbox.open).toBe(false);
    expect(listbox.shadowRoot!.querySelector('.listbox')!.hasAttribute('hidden')).toBe(true);
  });

  it('exposes role=listbox and the label on the popup', () => {
    const popup = listbox.shadowRoot!.querySelector('.listbox')!;
    expect(popup.getAttribute('role')).toBe('listbox');
    expect(popup.getAttribute('aria-label')).toBe('Attribute');
  });

  // The popup owns the trigger's ARIA — that is what lets the same rr-chip be
  // correct both as a trigger and as a plain filter.
  it('stamps aria-haspopup=listbox and live aria-expanded onto the trigger', async () => {
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    await listbox.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles open on trigger click', async () => {
    trigger.click();
    await listbox.updateComplete;
    expect(listbox.open).toBe(true);
    trigger.click();
    await listbox.updateComplete;
    expect(listbox.open).toBe(false);
  });

  it('fires rr-listbox-toggle on real transitions only', async () => {
    const seen: boolean[] = [];
    listbox.addEventListener('rr-listbox-toggle', (e) => {
      seen.push((e as CustomEvent<{ open: boolean }>).detail.open);
    });
    trigger.click();
    await listbox.updateComplete;
    trigger.click();
    await listbox.updateComplete;
    expect(seen).toEqual([true, false]);
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  it('marks every option with aria-selected, not just the chosen one', async () => {
    listbox.value = 'tenure';
    await listbox.updateComplete;
    await Promise.all(options.map((o) => o.updateComplete));
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
  });

  it('choosing an option sets value, fires rr-listbox-select, closes and refocuses the trigger', async () => {
    trigger.focus();
    trigger.click();
    await listbox.updateComplete;
    let detail: { value: string } | null = null;
    listbox.addEventListener('rr-listbox-select', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail;
    });
    options[1].click();
    await listbox.updateComplete;
    expect(detail).toEqual({ value: 'tenure' });
    expect(listbox.value).toBe('tenure');
    expect(listbox.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  // The listbox owns its value — unlike rr-chip[pressed], which is controlled.
  // A listbox holds exactly one value and can see the whole state; a chip is
  // one control in a row whose state is the set.
  it('updates its own value without the consumer round-tripping', async () => {
    options[0].click();
    await listbox.updateComplete;
    await Promise.all(options.map((o) => o.updateComplete));
    expect(listbox.value).toBe('income');
    expect(options[0].selected).toBe(true);
  });

  it('does not fire for a disabled option', async () => {
    trigger.click();
    await listbox.updateComplete;
    let fired = 0;
    listbox.addEventListener('rr-listbox-select', () => { fired += 1; });
    options[2].click();
    await listbox.updateComplete;
    expect(fired).toBe(0);
    expect(listbox.open).toBe(true);
  });

  // ── Keyboard ──────────────────────────────────────────────────────────────

  // The defining behaviour of a listbox over a menu: reopening puts you where
  // you already are, rather than making you re-find your own choice.
  it('opens focused on the CURRENT value, not the first option', async () => {
    listbox.value = 'score';
    await listbox.updateComplete;
    trigger.focus();
    key(trigger, 'ArrowDown');
    await listbox.updateComplete;
    await nextFrame();
    expect(document.activeElement).toBe(options[3]);
  });

  it('opens focused on the first option when nothing is chosen', async () => {
    trigger.focus();
    key(trigger, 'ArrowDown');
    await listbox.updateComplete;
    await nextFrame();
    expect(document.activeElement).toBe(options[0]);
  });

  it('skips disabled options and wraps with ArrowDown/ArrowUp', async () => {
    trigger.focus();
    key(trigger, 'ArrowDown');
    await listbox.updateComplete;
    await nextFrame();
    expect(document.activeElement).toBe(options[0]);
    key(options[0], 'ArrowDown');
    expect(document.activeElement).toBe(options[1]);
    key(options[1], 'ArrowDown');
    expect(document.activeElement).toBe(options[3]); // legacy is disabled
    key(options[3], 'ArrowDown');
    expect(document.activeElement).toBe(options[0]); // wraps
    key(options[0], 'ArrowUp');
    expect(document.activeElement).toBe(options[3]);
  });

  it('Home and End jump to the ends of the enabled options', async () => {
    trigger.click();
    await listbox.updateComplete;
    key(listbox, 'End');
    expect(document.activeElement).toBe(options[3]);
    key(listbox, 'Home');
    expect(document.activeElement).toBe(options[0]);
  });

  it('Enter chooses the focused option', async () => {
    trigger.click();
    await listbox.updateComplete;
    options[1].focus();
    let fired = 0;
    listbox.addEventListener('rr-listbox-select', () => { fired += 1; });
    key(options[1], 'Enter');
    await listbox.updateComplete;
    expect(fired).toBe(1);
    expect(listbox.value).toBe('tenure');
  });

  it('Escape closes and returns focus to the trigger', async () => {
    trigger.focus();
    trigger.click();
    await listbox.updateComplete;
    key(listbox, 'Escape');
    await listbox.updateComplete;
    expect(listbox.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('Tab closes without stealing focus back', async () => {
    trigger.click();
    await listbox.updateComplete;
    options[0].focus();
    key(options[0], 'Tab');
    await listbox.updateComplete;
    expect(listbox.open).toBe(false);
    expect(document.activeElement).not.toBe(trigger);
  });

  it('closes on an outside pointerdown', async () => {
    trigger.click();
    await listbox.updateComplete;
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await listbox.updateComplete;
    expect(listbox.open).toBe(false);
  });

  it('has no axe violations when open', async () => {
    trigger.click();
    await listbox.updateComplete;
    expect(await axe(listbox)).toHaveNoViolations();
  });
});

describe('rr-option', () => {
  let listbox: RrListbox;
  let options: RrOption[];

  beforeEach(async () => {
    document.body.innerHTML = '';
    listbox = mount('tenure');
    await listbox.updateComplete;
    options = [...listbox.querySelectorAll('rr-option')] as RrOption[];
    await Promise.all(options.map((o) => o.updateComplete));
  });

  it('carries role=option and a roving tabindex', () => {
    expect(options[0].getAttribute('role')).toBe('option');
    expect(options[0].getAttribute('tabindex')).toBe('-1');
  });

  it('states aria-selected=false rather than omitting it', () => {
    expect(options[0].hasAttribute('aria-selected')).toBe(true);
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });

  it('marks a disabled option with aria-disabled', () => {
    expect(options[2].getAttribute('aria-disabled')).toBe('true');
  });

  // Selection is carried by a glyph as well as colour — 1.4.1 (use of colour).
  it('renders a check for the selected option and keeps its box otherwise', () => {
    const check = (o: RrOption) => o.shadowRoot!.querySelector('.check')!;
    expect(check(options[1])).toBeTruthy();
    expect(check(options[0])).toBeTruthy();
    expect(check(options[0]).hasAttribute('hidden')).toBe(false);
  });

  it('hides the description and leading wrappers when their slots are empty', () => {
    const plain = options[0].shadowRoot!;
    expect(plain.querySelector('.description')!.hasAttribute('hidden')).toBe(true);
    expect(plain.querySelector('.leading')!.hasAttribute('hidden')).toBe(true);
  });

  it('shows the description wrapper when the slot is filled', () => {
    expect(
      options[1].shadowRoot!.querySelector('.description')!.hasAttribute('hidden')
    ).toBe(false);
  });

  it('does not fire rr-option-select while disabled', () => {
    let fired = 0;
    options[2].addEventListener('rr-option-select', () => { fired += 1; });
    options[2].click();
    expect(fired).toBe(0);
  });
});
