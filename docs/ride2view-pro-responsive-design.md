# Ride2View Pro — responsive marketplace visual specification

Reference: user-provided Ride2View Pro screenshot (design preview, sample listing cards, no verified transactions).

## Visual system
- Espresso `#302016`; warm ivory `#faf7ee`; champagne gold `#e8b84b`.
- Serif editorial headings (existing Playfair Display) and legible sans body (existing DM Sans).
- Photography: render uncropped originals at sufficient resolution, correct aspect ratio and `object-fit: cover`; do not upscale low-resolution files. Existing embedded sample images are retained and should be replaced only after verifying source ownership and sufficient source resolution.
- Hero: full width, layered dark gradient, logo/actions and central search.
- Content: Ride2Go/Ride2View tiles; featured horizontal five-up cards desktop; property category grid; recommended properties.
- All sample prices, counts, rankings and photos must remain identified as design-preview content until backed by real inventory.

## Breakpoints and acceptance criteria
| Width | Intended behavior |
| --- | --- |
| 320–380px | Single-column service tiles, two-column property cards, no horizontal page overflow |
| 390–700px | Two service tiles, horizontally scrolling featured listings, two-column suggestions |
| 701–1100px | Two service tiles, horizontally scrolling featured listings, three-column categories and suggestions |
| 1101–1440px | Five-column featured and suggested listings with full-width app shell |
| 1441px+ | Container width capped at 1440px for home inventory sections, full-width hero/navigation |

### Mandatory validation
1. Render at 320, 375, 390, 768, 1024, 1280, 1440 and 1920 CSS pixels.
2. Check all home, browse, property details, booking, driver and admin views.
3. Confirm no functional changes to auth, payments, fares, journey state or server endpoints.
4. Run `npm test`, `npm run check`, `npm run test:browser` with Node >=24.
5. Confirm Vercel preview is accessible; verify no accidental production promotion.
6. Request design sign-off prior to merging this branch.

## Implementation notes
- Scoped override in `css/app.css`; does not change JS or backend authority.
- Figma design: https://www.figma.com/design/fiv9jtO68erNdbNpMDJwkc (file created; editing pending Figma Starter plan quota).
- Crisp image supply remains dependent on licensed high-resolution photography.
