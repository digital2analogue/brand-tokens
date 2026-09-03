/**
 * JSX IntrinsicElements declarations for React consumers.
 *
 * React 19 passes unknown props to custom elements natively, but
 * TypeScript still needs these declarations for autocomplete and
 * type checking in TSX files.
 *
 * Usage in a React project:
 *   /// <reference types="@digital2analogue2/parsimony-components/react" />
 *   // or add to tsconfig: "types": ["@digital2analogue2/parsimony-components/react"]
 */

import type { RrAlert } from './alert/alert.js';
import type { RrAvatar } from './avatar/avatar.js';
import type { RrBadge } from './badge/badge.js';
import type { RrButton } from './button/button.js';
import type { RrCard } from './card/card.js';
import type { RrCheckbox } from './checkbox/checkbox.js';
import type { RrDialog } from './dialog/dialog.js';
import type { RrIcon } from './icon/icon.js';
import type { RrInput } from './input/input.js';
import type { RrLink } from './link/link.js';
import type { RrProgress } from './progress/progress.js';
import type { RrRadio } from './radio/radio.js';
import type { RrRadioGroup } from './radio/radio-group.js';
import type { RrSelect, SelectOption } from './select/select.js';
import type { RrSkeleton } from './skeleton/skeleton.js';
import type { RrSpinner } from './spinner/spinner.js';
import type { RrTab } from './tabs/tab.js';
import type { RrTabList } from './tabs/tab-list.js';
import type { RrChip } from './chip/chip.js';
import type { RrTextarea } from './textarea/textarea.js';
import type { RrToggle } from './toggle/toggle.js';

type LitProps<T> = Partial<Omit<T, keyof HTMLElement>> & React.HTMLAttributes<HTMLElement>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'rr-alert': LitProps<RrAlert> & {
        variant?: RrAlert['variant'];
        title?: string;
        dismissible?: boolean;
        children?: React.ReactNode;
        onClose?: (e: Event) => void;
      };
      'rr-avatar': LitProps<RrAvatar> & {
        size?: RrAvatar['size'];
        color?: RrAvatar['color'];
        name?: string;
        src?: string;
      };
      'rr-badge': LitProps<RrBadge> & {
        variant?: RrBadge['variant'];
        children?: React.ReactNode;
      };
      'rr-button': LitProps<RrButton> & {
        variant?: RrButton['variant'];
        size?: RrButton['size'];
        disabled?: boolean;
        loading?: boolean;
        type?: 'button' | 'submit' | 'reset';
        'aria-label'?: string;
        children?: React.ReactNode;
      };
      'rr-card': LitProps<RrCard> & {
        padding?: RrCard['padding'];
        children?: React.ReactNode;
      };
      'rr-checkbox': LitProps<RrCheckbox> & {
        name?: string;
        value?: string;
        checked?: boolean;
        indeterminate?: boolean;
        disabled?: boolean;
        label?: string;
        children?: React.ReactNode;
        onChange?: (e: Event) => void;
      };
      'rr-dialog': LitProps<RrDialog> & {
        heading?: string;
        open?: boolean;
        'close-on-backdrop'?: boolean;
        children?: React.ReactNode;
        'onRr-dialog-close'?: (e: CustomEvent) => void;
      };
      'rr-icon': LitProps<RrIcon> & {
        size?: RrIcon['size'];
        label?: string;
        children?: React.ReactNode;
      };
      'rr-input': LitProps<RrInput> & {
        type?: string;
        name?: string;
        value?: string;
        placeholder?: string;
        label?: string;
        'helper-text'?: string;
        'error-text'?: string;
        required?: boolean;
        disabled?: boolean;
        autocomplete?: string;
        onInput?: (e: Event) => void;
        onChange?: (e: Event) => void;
      };
      'rr-link': LitProps<RrLink> & {
        href?: string;
        target?: string;
        color?: RrLink['color'];
        children?: React.ReactNode;
      };
      'rr-radio': LitProps<RrRadio> & {
        value?: string;
        checked?: boolean;
        disabled?: boolean;
        children?: React.ReactNode;
        'onRr-radio-change'?: (e: CustomEvent) => void;
      };
      'rr-radio-group': LitProps<RrRadioGroup> & {
        name?: string;
        value?: string;
        label?: string;
        orientation?: RrRadioGroup['orientation'];
        disabled?: boolean;
        'error-text'?: string;
        children?: React.ReactNode;
        onChange?: (e: Event) => void;
      };
      'rr-skeleton': LitProps<RrSkeleton> & {
        variant?: RrSkeleton['variant'];
        width?: string;
        height?: string;
      };
      'rr-select': LitProps<RrSelect> & {
        name?: string;
        value?: string;
        options?: SelectOption[];
        placeholder?: string;
        label?: string;
        'helper-text'?: string;
        'error-text'?: string;
        required?: boolean;
        disabled?: boolean;
        onChange?: (e: Event) => void;
      };
      'rr-progress': LitProps<RrProgress> & {
        value?: number;
        max?: number;
        indeterminate?: boolean;
        label?: string;
      };
      'rr-spinner': LitProps<RrSpinner> & {
        size?: RrSpinner['size'];
        label?: string;
      };
      'rr-tab': LitProps<RrTab> & {
        value?: string;
        selected?: boolean;
        disabled?: boolean;
        children?: React.ReactNode;
      };
      'rr-tab-list': LitProps<RrTabList> & {
        label?: string;
        value?: string;
        children?: React.ReactNode;
        onChange?: (e: CustomEvent<{ value: string }>) => void;
      };
      'rr-chip': LitProps<RrChip> & {
        variant?: RrChip['variant'];
        children?: React.ReactNode;
      };
      'rr-textarea': LitProps<RrTextarea> & {
        name?: string;
        value?: string;
        placeholder?: string;
        label?: string;
        rows?: number;
        'helper-text'?: string;
        'error-text'?: string;
        required?: boolean;
        disabled?: boolean;
        onInput?: (e: Event) => void;
        onChange?: (e: Event) => void;
      };
      'rr-toggle': LitProps<RrToggle> & {
        name?: string;
        value?: string;
        checked?: boolean;
        disabled?: boolean;
        label?: string;
        children?: React.ReactNode;
        onChange?: (e: Event) => void;
      };
    }
  }
}

export {};
