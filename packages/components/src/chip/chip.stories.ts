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
  },
  args: { variant: 'default', label: 'Design Systems' },
  render: ({ variant, label }) => html`<rr-chip variant=${variant}>${label}</rr-chip>`,
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
