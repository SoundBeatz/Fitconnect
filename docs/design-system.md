# FitConnect Design System

Build: `20260717.6`

## Doel

Het Design System levert herbruikbare, toegankelijke en centraal beheerde UI-bouwstenen voor alle FitConnect-modules. Product-, CRM-, configurator- en gebruikersschermen gebruiken deze componenten zonder eigen lokale componentlogica te dupliceren.

## Kernbestanden

- `shared/design-tokens.css` — spacing, radius, shadows, timing en z-index.
- `shared/design-system.css` — basis- en geavanceerde visuele componenten.
- `shared/data-components.css` — pagination, filters, tooltips, popovers, progress en data states.
- `shared/components.js` — basiscomponenten.
- `shared/advanced-components.js` — tabs, accordion, dropdowns, stepper en command palette.
- `shared/data-components.js` — data-interactiecomponenten.

## Pagination

```html
<nav class="fc-pagination" data-fc-pagination aria-label="Paginering">
  <span class="fc-pagination__summary">1–20 van 96</span>
  <ol class="fc-pagination__list">
    <li><button class="fc-pagination__button" data-page="1" aria-current="page">1</button></li>
    <li><button class="fc-pagination__button" data-page="2">2</button></li>
  </ol>
</nav>
```

Event: `pagination:change` met `{ pager, page, button }`.

## Search & Filter Bar

```html
<form class="fc-filter-bar" data-fc-filter-bar>
  <label class="fc-field">
    <span class="fc-label">Zoeken</span>
    <input class="fc-input" type="search" name="query">
  </label>
  <label class="fc-field">
    <span class="fc-label">Status</span>
    <select class="fc-select" name="status"><option value="">Alle</option></select>
  </label>
  <button type="button" class="fc-button fc-button--secondary" data-fc-filter-reset>Wissen</button>
</form>
```

Event: `filters:change` met `{ bar, values }`.

## Tooltip

```html
<button class="fc-button" data-fc-tooltip="Instellingen openen">Instellingen</button>
```

Tooltips openen bij hover en focus en worden gekoppeld via `aria-describedby`.

## Popover

```html
<button data-fc-popover-trigger="help-popover">Uitleg</button>
<div id="help-popover" hidden>Inhoud van de popover.</div>
```

De popover sluit buiten het element en met Escape.

## Progress

```html
<div class="fc-progress" data-fc-progress data-value="65">
  <div class="fc-progress__meta"><span>Importeren</span><span data-fc-progress-value></span></div>
  <div class="fc-progress__track"><div class="fc-progress__bar"></div></div>
</div>
```

De component stelt automatisch de correcte progressbar-ARIA-attributen in.

## Data States

Gebruik één van de semantische staten: `empty`, `loading`, `error` of `success`.

```html
<section class="fc-data-state" data-state="empty">
  <strong class="fc-data-state__title">Geen resultaten</strong>
  <p class="fc-data-state__message">Pas de filters aan of voeg een nieuw item toe.</p>
</section>
```

## Architectuurregels

1. Gebruik eerst een bestaand component voordat nieuwe CSS of JavaScript wordt toegevoegd.
2. Interactie publiceert events via `FitConnectRegistry`.
3. Componenten moeten ook werken wanneer ze dynamisch aan de DOM worden toegevoegd.
4. Toetsenbordbediening en semantische ARIA-status zijn verplicht.
5. Product- of modulelogica hoort niet in het Design System.