import { describe, it, expect, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import './chip.js';
import type { RrChip } from './chip.js';

function createElement(html: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  const el = tpl.content.firstElementChild as HTMLElement;
  document.body.appendChild(el);
  return el;
}

describe('rr-chip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders with default variant', async () => {
    const el = createElement('<rr-chip>Design Systems</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.variant).toBe('default');
    expect(el.getAttribute('variant')).toBe('default');
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('reflects variant attribute to property', async () => {
    const el = createElement('<rr-chip variant="subtle">Skill</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.variant).toBe('subtle');
  });

  it('reflects variant property to attribute', async () => {
    const el = createElement('<rr-chip>Test</rr-chip>') as RrChip;
    await el.updateComplete;
    el.variant = 'subtle';
    await el.updateComplete;
    expect(el.getAttribute('variant')).toBe('subtle');
  });

  it('renders slotted content', async () => {
    const el = createElement('<rr-chip>Figma</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.textContent).toBe('Figma');
  });

  const variants = ['default', 'subtle'] as const;

  for (const variant of variants) {
    it(`has no a11y violations for variant="${variant}"`, async () => {
      const el = createElement(
        `<rr-chip variant="${variant}">${variant}</rr-chip>`
      ) as RrChip;
      await el.updateComplete;
      const results = await axe(document.body, {
        rules: {
          // The tag is an inline label, not a page landmark.
          // The region rule tests page structure, not component correctness.
          region: { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });
  }

  // ── Interactive modes (#229) ──────────────────────────────────────────────

  it('is inert by default — a span, no role, no button', async () => {
    const el = createElement('<rr-chip>Figma</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('button')).toBeNull();
    expect(el.shadowRoot!.querySelector('.body')!.tagName).toBe('SPAN');
  });

  it('renders a real button when interactive', async () => {
    const el = createElement('<rr-chip interactive>Filter</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('button.body')).toBeTruthy();
  });

  // pressed is the latched state of a filter chip; a latched chip that could
  // not be operated would be a badge wearing a chip's clothes.
  it('pressed implies interactive', async () => {
    const el = createElement('<rr-chip pressed>Income</rr-chip>') as RrChip;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('button.body');
    expect(btn).toBeTruthy();
    expect(btn!.getAttribute('aria-pressed')).toBe('true');
  });

  it('omits aria-pressed entirely when not pressed', async () => {
    const el = createElement('<rr-chip interactive>Filter</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('button.body')!.hasAttribute('aria-pressed')).toBe(false);
  });

  // Controlled, like rr-tab[selected] — the consumer owns the state.
  it('does not toggle itself on click', async () => {
    const el = createElement('<rr-chip interactive>Filter</rr-chip>') as RrChip;
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLButtonElement>('button.body')!.click();
    await el.updateComplete;
    expect(el.pressed).toBe(false);
  });

  it('lets a body click bubble out of the shadow root', async () => {
    const el = createElement('<rr-chip interactive>Filter</rr-chip>') as RrChip;
    await el.updateComplete;
    let clicks = 0;
    el.addEventListener('click', () => { clicks += 1; });
    el.shadowRoot!.querySelector<HTMLButtonElement>('button.body')!.click();
    expect(clicks).toBe(1);
  });

  it('renders no dismiss control unless removable', async () => {
    const el = createElement('<rr-chip>Figma</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.remove')).toBeNull();
  });

  it('fires rr-chip-remove from the dismiss control', async () => {
    const el = createElement('<rr-chip removable>Income</rr-chip>') as RrChip;
    await el.updateComplete;
    let fired = 0;
    el.addEventListener('rr-chip-remove', () => { fired += 1; });
    el.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!.click();
    expect(fired).toBe(1);
  });

  // A button inside a button is neither valid HTML nor operable, so the
  // dismiss control is a SIBLING of the body — and its click must not also
  // read as a click on the chip.
  it('keeps the dismiss control outside the body button', async () => {
    const el = createElement('<rr-chip interactive removable>Income</rr-chip>') as RrChip;
    await el.updateComplete;
    const body = el.shadowRoot!.querySelector('button.body')!;
    expect(body.querySelector('.remove')).toBeNull();
    expect(el.shadowRoot!.querySelector('.remove')).toBeTruthy();
  });

  it('does not let a remove click read as a chip click', async () => {
    const el = createElement('<rr-chip interactive removable>Income</rr-chip>') as RrChip;
    await el.updateComplete;
    let clicks = 0;
    el.addEventListener('click', () => { clicks += 1; });
    el.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!.click();
    expect(clicks).toBe(0);
  });

  it('names the dismiss control, and lets the consumer say what it removes', async () => {
    const el = createElement('<rr-chip removable>Income</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.remove')!.getAttribute('aria-label')).toBe('Remove');
    el.removeLabel = 'Remove Income filter';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.remove')!.getAttribute('aria-label')).toBe(
      'Remove Income filter'
    );
  });

  it('disables both controls when disabled', async () => {
    const el = createElement('<rr-chip interactive removable disabled>X</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('button.body')!.disabled).toBe(true);
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!.disabled).toBe(true);
  });

  it('does not fire rr-chip-remove while disabled', async () => {
    const el = createElement('<rr-chip removable disabled>X</rr-chip>') as RrChip;
    await el.updateComplete;
    let fired = 0;
    el.addEventListener('rr-chip-remove', () => { fired += 1; });
    el.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );
    expect(fired).toBe(0);
  });

  // empty must read as awaiting input, never as disabled — so it stays
  // operable and keeps its role.
  it('keeps an empty chip operable', async () => {
    const el = createElement('<rr-chip interactive empty>Select attribute</rr-chip>') as RrChip;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('button.body')!;
    expect(btn.disabled).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('exposes leading and trailing slots', async () => {
    const el = createElement('<rr-chip>Figma</rr-chip>') as RrChip;
    await el.updateComplete;
    const names = [...el.shadowRoot!.querySelectorAll('slot')].map((s) => s.getAttribute('name'));
    expect(names).toContain('leading');
    expect(names).toContain('trailing');
  });

  // The popup owns these — rr-menu stamps them on whatever it is given. A chip
  // that hardcoded them would be wrong the moment it is used as a plain filter.
  it('never declares aria-haspopup or aria-expanded itself', async () => {
    const el = createElement('<rr-chip interactive>Attribute</rr-chip>') as RrChip;
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).not.toContain('aria-haspopup');
    expect(html).not.toContain('aria-expanded');
  });

  it('has no axe violations when interactive and removable', async () => {
    const el = createElement('<rr-chip interactive removable>Income</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(await axe(el)).toHaveNoViolations();
  });

  it('has no axe violations when pressed', async () => {
    const el = createElement('<rr-chip pressed>Income</rr-chip>') as RrChip;
    await el.updateComplete;
    expect(await axe(el)).toHaveNoViolations();
  });
});
