import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
// Barrel side-effect import registers every rr-* element (see story-ui.config.js).
import '@digital2analogue2/parsimony-components';

const meta: Meta = {
  title: 'Components/Segmented',
  component: 'rr-segmented',
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: { label: 'Outcome', value: 'approve', disabled: false },
  render: ({ label, value, disabled }) => html`
    <rr-segmented label=${label} value=${value} ?disabled=${disabled}>
      <rr-segment value="approve" tone="success">Approve</rr-segment>
      <rr-segment value="deny" tone="danger">Deny</rr-segment>
    </rr-segmented>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {};

// The unanswered field: no indicator at all, so a draft row cannot be
// mistaken for one that chose the first option.
export const Unanswered: Story = { args: { value: '' } };

export const Denied: Story = { args: { value: 'deny' } };

export const Disabled: Story = { args: { disabled: true } };

export const Neutral: Story = {
  args: { label: 'Density', value: 'comfortable' },
  render: ({ label, value }) => html`
    <rr-segmented label=${label} value=${value}>
      <rr-segment value="compact">Compact</rr-segment>
      <rr-segment value="comfortable">Comfortable</rr-segment>
      <rr-segment value="spacious">Spacious</rr-segment>
    </rr-segmented>
  `,
};

export const Tones: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: var(--spacing-inline); align-items: flex-start;">
      ${(['success', 'danger', 'warning', 'info'] as const).map(
        (tone) => html`
          <rr-segmented label=${tone} value="on">
            <rr-segment value="on" tone=${tone}>${tone}</rr-segment>
            <rr-segment value="off">Off</rr-segment>
          </rr-segmented>
        `
      )}
    </div>
  `,
};
