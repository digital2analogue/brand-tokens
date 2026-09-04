import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
// Barrel side-effect import registers every rr-* element (see story-ui.config.js).
import '@digital2analogue2/parsimony-components';

const VARIANTS = ['default', 'subtle'] as const;

const meta: Meta = {
  title: 'Components/Chip',
  component: 'rr-chip',
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    label: { control: 'text' },
    interactive: { control: 'boolean' },
    pressed: { control: 'boolean' },
    removable: { control: 'boolean' },
    empty: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    variant: 'default',
    label: 'Design Systems',
    interactive: false,
    pressed: false,
    removable: false,
    empty: false,
    disabled: false,
  },
  render: ({ variant, label, interactive, pressed, removable, empty, disabled }) => html`<rr-chip
    variant=${variant}
    ?interactive=${interactive}
    ?pressed=${pressed}
    ?removable=${removable}
    ?empty=${empty}
    ?disabled=${disabled}
    >${label}</rr-chip
  >`,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {};

export const Subtle: Story = { args: { variant: 'subtle', label: 'Decision Tooling' } };

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-inline);">
      ${VARIANTS.map((v) => html`<rr-chip variant=${v}>${v}</rr-chip>`)}
    </div>
  `,
};

// Mirrors the skill-tag row on riverromney.design/about that motivated this
// component — the outlined uppercase pattern badge was never meant to cover.
export const SkillTags: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-tight);">
      ${[
        'Design Systems',
        'B2B / Enterprise UX',
        'Compliance UX',
        'Decision Tooling',
        'Figma',
        'Research',
        'Prototyping',
        'Cross-functional Leadership',
      ].map((s) => html`<rr-chip>${s}</rr-chip>`)}
    </div>
  `,
};

// ── Interactive modes (#229) ────────────────────────────────────────────────
// One silhouette throughout: every chip here is radius.sm. What changes is the
// affordance — the accent, the focus ring, Enter/Space.

export const Interactive: Story = {
  args: { interactive: true, label: 'Compliance UX' },
};

export const Pressed: Story = {
  args: { interactive: true, pressed: true, label: 'Compliance UX' },
};

export const Removable: Story = {
  args: { removable: true, label: 'Income > 75k' },
};

// Awaiting input, not disabled: still operable, still a legible edge.
export const Empty: Story = {
  args: { interactive: true, empty: true, label: 'Select attribute' },
};

export const Disabled: Story = {
  args: { interactive: true, removable: true, disabled: true, label: 'Locked' },
};

// The four modes side by side — the point being that the outline never moves.
export const Modes: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-tight); align-items: center;">
      <rr-chip>Static</rr-chip>
      <rr-chip interactive>Interactive</rr-chip>
      <rr-chip interactive pressed>Pressed</rr-chip>
      <rr-chip removable remove-label="Remove this value">Removable</rr-chip>
      <rr-chip interactive empty>Empty</rr-chip>
    </div>
  `,
};

// A filter row — the shape this component exists for.
export const FilterRow: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-tight);">
      ${[
        ['Design Systems', true],
        ['Compliance UX', false],
        ['Decision Tooling', true],
        ['Research', false],
      ].map(
        ([label, on]) =>
          html`<rr-chip interactive ?pressed=${on}>${label}</rr-chip>`
      )}
    </div>
  `,
};
