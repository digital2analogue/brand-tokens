# AGENTS.md

> Vendor-neutral entry point for AI agents (Cursor, Copilot, Claude Code, custom MCP clients) building UI **with** this design system.

## Purpose

You're an agent building UI in a repo that depends on `@digital2analogue2/parsimony` — and, once available, `@digital2analogue2/parsimony-components`. This file tells you how to use them correctly.

To propose a change to the design system itself (new token, renamed token, new component variant), open a PR against `digital2analogue/Parsimony`. That workflow is documented in [`CLAUDE.md`](./CLAUDE.md), not here.

## Always-on foundations

These three files describe the tokens, rules, and per-brand decisions you must respect when consuming the design system. Read all three before generating UI:

- [`ai/rules.md`](./ai/rules.md) — hard rules and soft rules (applies to all brands)
- [`ai/DESIGN.md`](./ai/DESIGN.md) — base dark theme token tables (applies to base, dot-art, dot-blog)
- [`ai/DECISION-ENGINE.md`](./ai/DECISION-ENGINE.md) — decision-engine sub-brand decisions (applies to decision-engine only)

Each file declares its scope in YAML front-matter (`scope`, `applies-to`, `always-on`) so you can filter without reading the body.

**No repo checkout? Use the context packs in the installed package.** `node_modules/@digital2analogue2/parsimony/` ships compiled, sharded context so any agent can be governed without the MCP or this repo: start at `context/system.md` (rules + brands + the map), then load only what you need — `tokens.json` (full catalog + brand overrides), `context/components/<tag>.md` (one contract per component: props, bindings, slots + accepts, tokens, a11y, examples), `pairings.json`, `rules.json`. `context/index.json` is the machine-readable manifest.

## Components

`@digital2analogue2/parsimony-components` ships framework-agnostic Lit web components. Query the MCP server (`list_components` / `get_component`) for the authoritative, always-current contract — the table below is a convenience index generated from `design-system.json`.

| Component | Summary |
|---|---|
| `<rr-alert>` | Inline notification banner for success, warning, danger, and info messages. Optionally dismissible. |
| `<rr-avatar>` | Circular identity surface showing initials or an image, with size and accent-color variants. |
| `<rr-badge>` | Status badge and accent chip. 9 variants styled by semantic tokens; brand theming cascades via CSS custom properties. |
| `<rr-button>` | Button with primary/secondary/ghost/danger variants, three sizes (sm/md/lg), loading spinner, and full keyboard/form semantics. |
| `<rr-card>` | Surface container on the elevated background tier with optional header, body, and footer slots. |
| `<rr-checkbox>` | Form-associated checkbox with checked, indeterminate, and disabled states. Backed by ElementInternals. |
| `<rr-dialog>` | Modal dialog built on the native `<dialog>` element with focus trap and Escape-to-close. |
| `<rr-icon>` | Sized, accessible wrapper for inline SVG icons. Decorative by default; labelled icons become `role="img"`. |
| `<rr-input>` | Form-associated text input with label, helper/error text, and ElementInternals for native form participation. |
| `<rr-link>` | Anchor enforcing the design system link style — underlined by default, underline removed on hover. |
| `<rr-menu>` | Dropdown action menu (WAI-ARIA menu-button pattern) with full keyboard navigation, Escape/outside-click dismissal, and trigger ARIA wiring. |
| `<rr-menu-item>` | A single action inside `<rr-menu>`; `danger` and `disabled` modifiers; focus managed by the parent menu. |
| `<rr-progress>` | Horizontal progress bar with determinate and indeterminate modes, using native `role="progressbar"`. |
| `<rr-radio>` | Individual radio button. Must be used inside `<rr-radio-group>`, which manages name, value, and selection. |
| `<rr-radio-group>` | Form-associated group of radio buttons. Renders a fieldset/legend and manages selection and form value for its `<rr-radio>` children. |
| `<rr-select>` | Form-associated select dropdown with label, helper text, and error state. Options supplied via the `options` property. |
| `<rr-skeleton>` | Animated shimmer placeholder for loading states. Text, circular, and rectangular shape variants. |
| `<rr-spinner>` | Animated circular loading indicator that announces its status to screen readers. |
| `<rr-tab>` | A single tab button used inside `<rr-tab-list>`; its selection state is managed by the parent. |
| `<rr-table>` | Structural data table (CSS table layout + ARIA table roles) owning zebra, hover, and selected row states for the whole family. |
| `<rr-table-row>` | A row inside `<rr-table>`; carries `role="row"` and the `selected` state; visuals painted by the parent table. |
| `<rr-table-cell>` | A cell inside `<rr-table-row>`; `header` cells get the muted all-caps recipe, `numeric` cells right-align in mono. |
| `<rr-tab-list>` | Accessible tab strip that wraps `<rr-tab>` elements, managing selection and arrow-key navigation. |
| `<rr-textarea>` | Form-associated multi-line text area with label, helper text, and error state. |
| `<rr-toast>` | Transient floating notification with status variants, optional auto-dismiss (hover/focus-paused), an action slot, and live-region semantics. |
| `<rr-toggle>` | Form-associated toggle switch for binary on/off settings. |

### Installation

```bash
npm install @digital2analogue2/parsimony-components lit
```

### Usage (vanilla / any framework)

```js
import '@digital2analogue2/parsimony-components';
```

Then use the custom elements in HTML:

```html
<rr-button variant="primary">Save</rr-button>
<rr-badge variant="success">Approved</rr-badge>
<rr-input label="Email" placeholder="you@example.com"></rr-input>
```

### Usage in React 19

React 19 passes props to custom elements natively. No wrappers needed.

```tsx
/// <reference types="@digital2analogue2/parsimony-components/react" />
import '@digital2analogue2/parsimony-components';

function Actions() {
  return (
    <div>
      <rr-button>Approve</rr-button>
      <rr-button variant="danger">Deny</rr-button>
      <rr-badge variant="success">Done</rr-badge>
    </div>
  );
}
```

The `@digital2analogue2/parsimony-components/react` reference adds JSX IntrinsicElements types for autocomplete. Add it as a `/// <reference>` directive or in `tsconfig.json` `"types"` array.

### Event handling in React

React 19 supports `onInput` and `onChange` on custom elements natively. For `<rr-input>`:

```tsx
<rr-input
  label="Name"
  onInput={(e: Event) => setName((e.target as HTMLInputElement).value)}
/>
```

### Assembly patterns

Recipes for composing components — the judgment calls the component contracts alone don't answer:

- **Vertical form/field stack:** gap between distinct fields is `--spacing-component` (24px — "between distinct components"). Within one field, the component already handles label/input/helper spacing — don't add more.
- **Actions row (Save/Cancel):** horizontal `--spacing-inline` (12px) gap; primary action first, quiet action (`variant="ghost"` or `secondary`) beside it. One `variant="primary"` per view.
- **Settings/detail panel:** wrap in `rr-card` (`padding="lg"` for roomy forms); title in the `header` slot, actions row in the `footer` slot.
- **Layout widths:** the spacing scale deliberately does not cover layout widths (container max-widths, column widths). Those are app-local values — `max-width: 28rem` on a settings panel is allowed and is not a token violation. Everything else (gaps, padding) must come from the scale.

### MCP tools (in-repo at `packages/mcp`)

Registered project-wide via `.mcp.json` at the repo root, so any Claude Code
session in a clone gets the `parsimony` server automatically — run `npm ci`
once first (the server needs the workspace-installed MCP SDK). Other agent
CLIs can register the same entry point: `node packages/mcp/src/server.mjs`
(stdio).

- `list_components()` — names and summaries
- `get_component(name)` — props, slots, events, tokens used, rules, examples, accessibility contract
- `check_usage(snippet)` — flags violations of rules in `ai/rules.md` (hex literals, `--primitive-*` references, deprecated tokens)

## Hard limits when using the system

- **Never use hex literals** — always `var(--color-*)`
- **Never reference `--primitive-*` in UI code** — those are an internal implementation layer; consume the semantic layer (`--color-*`, `--font-*`, `--spacing-*`, etc.) only
- **Never invent a token** — if `check_usage` rejects it, request the addition upstream rather than fabricating a name
- **Never bake font-family or font-size literals** — always `var(--font-*)`
- **All text/background pairings must already pass WCAG AA** per `ai/DESIGN.md` — do not introduce new pairings without verifying
- **Match brand by loading the appropriate brand CSS** — do not hand-author brand differences inline

## Brands

Pick the brand by loading the appropriate `build/css/<brand>.css` file at the consumer page level. Components and tokens cascade from `:root` automatically.

| Brand | Sites | Notes |
|---|---|---|
| **base** (default) | `riverromney.com`, `riverromney.design` | Dark theme, phosphor green accent |
| **decision-engine** | enterprise data UI surfaces | Light-mode, primary-blue action color, Geist font exception |
| **dot-art** | `riverromney.art` | Pure-black canvas override for photo contrast |
| **dot-blog** | `riverromney.blog` | 18px body, relaxed line-height for long-form reading |
