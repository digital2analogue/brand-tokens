import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
// Barrel side-effect import registers every rr-* element (see story-ui.config.js).
import '@digital2analogue2/parsimony-components';

const meta: Meta = {
  title: 'Components/Listbox',
  component: 'rr-listbox',
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    open: { control: 'boolean' },
    placement: { control: 'inline-radio', options: ['bottom-start', 'bottom-end'] },
  },
  args: { label: 'Attribute', value: 'income', open: false, placement: 'bottom-start' },
  render: ({ label, value, open, placement }) => html`
    <rr-listbox label=${label} value=${value} ?open=${open} placement=${placement}>
      <rr-chip slot="trigger" interactive>Income</rr-chip>
      <rr-option value="income">Income</rr-option>
      <rr-option value="tenure">Tenure</rr-option>
      <rr-option value="score">Credit score</rr-option>
    </rr-listbox>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {};

// Baselines capture the resting trigger; Open is the story that shows the
// popup, so the surface, the check and the row rhythm are all snapshotted.
export const Open: Story = { args: { open: true } };

// Nothing chosen yet: the trigger is an EMPTY chip — dashed, muted, still
// fully operable. Never `disabled`, which would announce the control as
// unavailable at the moment it is the next thing to press.
export const Empty: Story = {
  args: { value: '', open: true },
  render: ({ label, value, open }) => html`
    <rr-listbox label=${label} value=${value} ?open=${open}>
      <rr-chip slot="trigger" interactive empty>Select attribute</rr-chip>
      <rr-option value="income">Income</rr-option>
      <rr-option value="tenure">Tenure</rr-option>
      <rr-option value="score">Credit score</rr-option>
    </rr-listbox>
  `,
};

// The reason this family exists next to rr-select: a native <option> renders
// text and nothing else, at any level of CSS effort.
export const RichOptions: Story = {
  args: { label: 'Outcome', value: 'approve', open: true },
  render: ({ label, value, open }) => html`
    <rr-listbox label=${label} value=${value} ?open=${open}>
      <rr-chip slot="trigger" interactive>Approve</rr-chip>
      <rr-option value="approve"
        >Approve<span slot="description">Send straight to funding</span></rr-option
      >
      <rr-option value="review"
        >Review<span slot="description">Queue for an analyst</span></rr-option
      >
      <rr-option value="deny"
        >Deny<span slot="description">Close with a reason code</span></rr-option
      >
    </rr-listbox>
  `,
};

export const DisabledOption: Story = {
  args: { open: true },
  render: ({ label, value, open }) => html`
    <rr-listbox label=${label} value=${value} ?open=${open}>
      <rr-chip slot="trigger" interactive>Income</rr-chip>
      <rr-option value="income">Income</rr-option>
      <rr-option value="tenure">Tenure</rr-option>
      <rr-option value="legacy" disabled>Legacy score</rr-option>
    </rr-listbox>
  `,
};

export const RightAligned: Story = {
  args: { label: 'Sort', value: 'recent', open: true, placement: 'bottom-end' },
  render: ({ label, value, open, placement }) => html`
    <div style="display: flex; justify-content: flex-end">
      <rr-listbox label=${label} value=${value} ?open=${open} placement=${placement}>
        <rr-chip slot="trigger" interactive>Most recent</rr-chip>
        <rr-option value="recent">Most recent</rr-option>
        <rr-option value="oldest">Oldest first</rr-option>
      </rr-listbox>
    </div>
  `,
};

// The whole point of the split, side by side: a listbox SETS A VALUE and the
// choice stays marked; a menu FIRES A COMMAND and nothing latches. The chip
// and button silhouettes are the only cue at rest.
export const VersusMenu: Story = {
  args: { label: 'Attribute', value: 'income', open: false },
  render: ({ label, value }) => html`
    <div style="display: flex; gap: 24px; align-items: flex-start">
      <rr-listbox label=${label} value=${value}>
        <rr-chip slot="trigger" interactive>Income</rr-chip>
        <rr-option value="income">Income</rr-option>
        <rr-option value="tenure">Tenure</rr-option>
      </rr-listbox>
      <rr-menu label="Row actions">
        <rr-button slot="trigger" variant="secondary">Actions</rr-button>
        <rr-menu-item value="edit">Edit rule</rr-menu-item>
        <rr-menu-item value="delete" danger>Delete rule</rr-menu-item>
      </rr-menu>
    </div>
  `,
};
