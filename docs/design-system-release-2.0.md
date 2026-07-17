# FitConnect Design System 2.0

Status: **Fase 2 afgerond**  
Branch: `hostinger-static`  
Release: `20260717.7`

## Doel

Het Design System levert één herbruikbare, toegankelijke en uitbreidbare UI-laag voor alle volgende FitConnect-modules. Nieuwe schermen horen primair uit bestaande componenten te worden samengesteld.

## Beschikbare bouwblokken

- Layout: container, section, grid, stack, cluster, split, sidebar en hero.
- Controls: buttons, form fields, search en filters.
- Content: cards, KPI cards, badges, alerts en breadcrumbs.
- Data: tables, pagination, loading, empty, error en success states.
- Navigation: tabs, accordion, stepper, dropdown en command palette.
- Feedback: modal, toast, tooltip, popover, progress en skeleton.
- Foundation: design tokens, theme, typography en icons.

## Centrale API

```js
FitConnectDesignSystem.mount(document);
FitConnectDesignSystem.get('table');
FitConnectDesignSystem.on('filters:change', event => {});
FitConnectDesignSystem.announce('Product opgeslagen');
FitConnectDesignSystem.audit(document);
```

## Toegankelijkheidscontract

- Alle interactieve bediening moet met toetsenbord bereikbaar zijn.
- Zichtbare focus mag niet worden verwijderd.
- Icon-only controls moeten een toegankelijke naam hebben.
- Formuliervelden moeten een label, `aria-label` of `aria-labelledby` hebben.
- Modals en command palettes moeten focus vasthouden en bij sluiten herstellen.
- Dynamische statuswijzigingen worden via `FitConnectDesignSystem.announce()` gemeld.
- Animaties respecteren `prefers-reduced-motion`.
- Windows High Contrast wordt ondersteund via `forced-colors`.

## Kwaliteitscontrole voor nieuwe componenten

1. Werkt met muis, touch en toetsenbord.
2. Heeft correcte rollen, states en labels.
3. Werkt vanaf 320 px breedte.
4. Gebruikt uitsluitend centrale tokens voor spacing, radius, kleur, schaduw en timing.
5. Registreert zichzelf in de Registry.
6. Biedt een declaratieve HTML-interface en waar nodig een JavaScript-API.
7. Levert events via de Registry in de vorm `onderdeel:actie`.
8. Heeft loading, empty, error en success states waar data wordt gebruikt.
9. Voegt geen pagina-specifieke CSS toe aan gedeelde componentbestanden.
10. Wordt toegevoegd aan de showcase en documentatie.

## Handmatige releasecontrole

- [ ] Tabvolgorde doorlopen zonder muis.
- [ ] Escape getest op modal, dropdown, popover en command palette.
- [ ] Focusherstel getest na overlays.
- [ ] Showcase getest op 320, 768, 1024 en 1440 px.
- [ ] Light en dark theme gecontroleerd.
- [ ] Reduced motion gecontroleerd.
- [ ] Browserconsole vrij van runtimefouten.
- [ ] `FitConnectDesignSystem.audit(document)` geeft geen onverklaarde problemen.

## Architectuurregel

Fase 3 en latere modules mogen het Design System uitbreiden, maar mogen bestaande componenten niet lokaal dupliceren. Algemene UI-verbeteringen gaan eerst terug naar deze centrale laag.
