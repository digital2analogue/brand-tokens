import figma, { html } from '@figma/code-connect';

/**
 * Code Connect mapping for <rr-chip> (renamed from <rr-tag>, #229).
 *
 * Figma file:  Parsimony Design System (4aOEBHcnAv2Kbn0g1arL78)
 * Component:   Tag ComponentSet — node 171:28 (page "Components / Tag")
 *
 * NOTE: the Figma set is still named "Tag". This PR renamed the code side only
 * (#229); node IDs are stable across a Figma rename, so this mapping keeps
 * working either way, but the two sides disagree on the noun until someone
 * renames the set in Figma. Tracked in #34.
 * Variant props:
 *   "Variant" — default | subtle  (1:1 with the element)
 *
 * The set was created 2026-07-15 during the FigmaLint gap-fill — Tag was
 * the last rr-* component with no design counterpart.
 */
figma.connect(
  'https://figma.com/design/4aOEBHcnAv2Kbn0g1arL78/Parsimony-Design-System?node-id=171-28',
  {
    props: {
      variant: figma.enum('Variant', {
        default: 'default',
        subtle:  'subtle',
      }),
    },
    example: ({ variant }) =>
      html`<rr-chip variant="${variant}">Chip</rr-chip>`,
  }
);
