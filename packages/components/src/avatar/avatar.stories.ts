import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '@digital2analogue2/parsimony-components';
import { SAMPLE_AVATAR_SRC } from './avatar-fixture.js';

const meta: Meta = {
  title: 'Components/Avatar',
  component: 'rr-avatar',
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    color: { control: 'select', options: ['default', 'indigo', 'sky', 'green', 'amber'] },
    name: { control: 'text' },
    src: { control: 'text' },
    alt: { control: 'text' },
  },
  args: {
    size: 'md',
    color: 'default',
    name: 'River Romney',
    src: '',
    alt: '',
  },
  render: ({ size, color, name, src, alt }) => html`
    <rr-avatar
      size=${size}
      color=${color}
      name=${name}
      src=${src}
      alt=${alt}
    ></rr-avatar>
  `,
};
export default meta;

type Story = StoryObj;

export const Initials: Story = { args: { name: 'River Romney' } };

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: var(--spacing-inline);">
      <rr-avatar size="sm" name="River Romney"></rr-avatar>
      <rr-avatar size="md" name="River Romney"></rr-avatar>
      <rr-avatar size="lg" name="River Romney"></rr-avatar>
      <rr-avatar size="xl" name="River Romney"></rr-avatar>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: var(--spacing-inline);">
      <rr-avatar color="default" name="River Romney"></rr-avatar>
      <rr-avatar color="indigo" name="River Romney"></rr-avatar>
      <rr-avatar color="sky" name="River Romney"></rr-avatar>
      <rr-avatar color="green" name="River Romney"></rr-avatar>
      <rr-avatar color="amber" name="River Romney"></rr-avatar>
    </div>
  `,
};

export const Image: Story = {
  args: { src: SAMPLE_AVATAR_SRC, alt: 'User' },
};
