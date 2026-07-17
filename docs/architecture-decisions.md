# FitConnect Architecture Decision Log

## ADL-0001 — Centrale Registry

**Status:** accepted

Alle kernmodules, services en UI-componenten registreren zichzelf in `FitConnectRegistry`.

**Waarom**

- modules hoeven elkaar niet rechtstreeks te importeren;
- onderdelen zijn runtime opvraagbaar;
- toekomstige plugins kunnen zichzelf aanmelden;
- events en metadata zijn centraal beschikbaar.

## ADL-0002 — Service Layer tussen UI en data

**Status:** accepted

Pagina's en componenten benaderen externe data niet rechtstreeks. Interactie loopt via geregistreerde services.

**Waarom**

- logging, foutafhandeling en caching komen op één plek;
- Supabase kan later worden vervangen of uitgebreid;
- services zijn eenvoudiger te testen;
- toekomstige AI-processen kunnen op service-events reageren.

## ADL-0003 — Centraal Design System

**Status:** accepted

Visuele bouwstenen gebruiken centrale design tokens en componentklassen uit `shared/design-tokens.css` en `shared/design-system.css`.

**Waarom**

- consistente interface op alle modules;
- wijzigingen hoeven maar één keer te worden uitgevoerd;
- toegankelijkheid en responsiviteit zijn centraal beheersbaar;
- het Command Center kan tokens later zonder code bestuurbaar maken.

## ADL-0004 — Manifestgestuurd assetbeheer

**Status:** accepted

`shared/core.js` laadt platformassets vanuit `shared/build.json` en voorziet ze van de actuele buildversie.

**Waarom**

- browsers laden na een release automatisch de nieuwste bestanden;
- gebruikers hoeven geen harde refresh uit te voeren;
- assets kunnen centraal worden toegevoegd, verwijderd of geordend.

## Vaste bouwvolgorde

1. Core Foundation
2. Design System
3. Service Layer
4. Plugin Engine
5. User Engine
6. Shop Engine
7. Configurator Engine
8. CRM
9. AI Platform
