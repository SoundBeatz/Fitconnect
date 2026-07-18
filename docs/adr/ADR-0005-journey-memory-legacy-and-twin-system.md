# ADR-0005 — Journey Memory, Legacy and the TwiN System

## Status

Accepted

## Context

FitConnect is intended to remember a person's complete growth journey, not only their current state. Users need to understand where they came from, what they did one week ago, sixty-seven days ago or five years ago, what helped them, who supported them, what they bought and what value those choices created.

Fitness data without context becomes a collection of isolated records. FitConnect must convert those records into a meaningful personal history.

The platform must also help people connect with compatible training partners. This includes digital training sessions, accountability, community support and safe in-person meetups at regular gyms or other approved locations.

## Decision

FitConnect will treat long-term journey memory as a first-class platform capability.

The Journey Engine will preserve an explainable timeline of relevant events across all authorized domains. The user remains the owner of their personal story and controls visibility, sharing, export and deletion subject to legal and operational retention requirements.

FitConnect will introduce the **TwiN System** as the platform's buddy and training-partner capability.

TwiN means a mutually accepted connection between two compatible users for one or more purposes, such as:

- accountability;
- digital co-training;
- shared programmes or challenges;
- motivation and emotional support;
- achievement celebration;
- knowledge exchange;
- arranging an in-person training session;
- helping another user reuse, transfer or understand suitable products and equipment.

A TwiN relationship is not automatically public, permanent, romantic or location-sharing. It is permission-based, purpose-bound and revocable.

## Journey Memory Model

Journey memory must support questions such as:

- What did I do one week ago?
- What happened sixty-seven days ago?
- Where was I five years ago?
- Which goal was I working toward?
- Which setbacks did I face?
- Which training, nutrition or recovery choices worked?
- Which people supported me?
- Which coach, gym or community contributed?
- Which products or services did I purchase?
- Why did I purchase them?
- Did they create the expected benefit?
- Can I maintain, resell, transfer, donate or pass them on?
- What knowledge from my journey could help someone else?

The timeline may reference records owned by other engines, but the Journey Engine does not duplicate their complete business truth. It stores durable journey references, user-authored meaning, snapshots where necessary, and provenance.

## Core Journey Concepts

The Journey Engine should distinguish at least:

- **event** — something happened;
- **moment** — a personally meaningful event or period;
- **milestone** — a measurable or declared achievement;
- **setback** — a difficulty, interruption or decline;
- **decision** — a choice and its stated reason;
- **intervention** — training, coaching, nutrition, recovery, product or service used;
- **outcome** — the observed or reported result;
- **support contribution** — help from a coach, TwiN, buddy, community member or organisation;
- **reflection** — what the user learned or felt;
- **legacy item** — content or knowledge deliberately preserved for future self or others.

Every relevant item should be able to carry:

- occurrence time and recorded time;
- source domain and source record;
- tenant and workspace context where applicable;
- actor and subject;
- visibility and consent scope;
- user-authored narrative;
- media references;
- tags and classifications;
- provenance and confidence;
- correction and supersession history.

## Memory Is Legacy

FitConnect adopts the principle:

> Memory is continuity. Memory is context. Memory is legacy.

Legacy does not mean making all historical information public. It means preserving meaning over time so the user can understand, learn from and selectively share their journey.

The platform must support:

- private memory;
- selectively shared memory;
- community posts derived from journey moments;
- coach-visible records with consent;
- TwiN-visible records with consent;
- anniversary and comparison views;
- personal exports;
- memorial or legacy handling only through explicit future policy and consent.

## Commerce and Journey

A purchase is not merely an order record. Where the user chooses, it may become part of the journey:

```text
Need or goal
  -> purchase decision
  -> product or service
  -> usage
  -> observed benefit
  -> maintenance or support
  -> reuse, transfer, resale, donation or disposal
```

Commerce remains the source of truth for orders, ownership status, warranties and transfers. Journey records why the purchase mattered and what outcome the user experienced.

Recommendations and claims must remain explainable. AI may identify correlations, but may not present unverified causation as fact.

## TwiN System

### Matching dimensions

TwiN matching may consider user-approved criteria such as:

- training goals;
- experience level;
- preferred activities;
- schedule compatibility;
- digital or in-person preference;
- approximate area or preferred gym;
- language;
- coaching or accountability style;
- accessibility needs;
- age-range preference where lawful;
- challenge participation;
- safety and trust signals.

Sensitive attributes must not be used without a lawful basis, explicit purpose and suitable safeguards.

### Relationship lifecycle

```text
suggested
  -> invited
  -> accepted
  -> active
  -> paused
  -> ended

Any state may move to blocked or reported where appropriate.
```

Both users must consent before a TwiN connection becomes active. A user must be able to pause, end, block or report the relationship.

### TwiN purposes and scopes

A connection must define one or more scopes:

- chat;
- digital training;
- progress accountability;
- selected journey visibility;
- shared challenges;
- calendar availability;
- gym meetup planning;
- product or equipment knowledge exchange.

No scope is implied merely because the users are connected.

### Digital training

The system should eventually support:

- synchronized or asynchronous workouts;
- live presence indicators with consent;
- shared timers and session status;
- encouragement and reactions;
- optional video integrations;
- session summaries;
- shared achievements;
- emergency exit, mute and block controls.

### In-person training

For physical meetups, the platform must be safety-first. It should support:

- approximate rather than exact location during discovery;
- public or verified venues as the default meetup location;
- mutual confirmation;
- optional calendar coordination;
- check-in and session completion;
- cancellation and no-show handling;
- block and report capabilities;
- clear safety guidance;
- stricter policies for minors and vulnerable users.

FitConnect does not guarantee another user's identity, behavior, fitness level or safety unless a separate verified programme explicitly provides such assurance.

## Benefits Architecture

Every engine and user-facing capability must document its benefits, not only its features.

A benefit statement should answer:

1. What problem does this solve?
2. For whom?
3. What becomes easier, safer, faster, clearer or more motivating?
4. How can the user observe that benefit?
5. Which engine produces the evidence?
6. What are the limits or risks?

For example:

| Capability | Feature | User benefit | Evidence |
|---|---|---|---|
| Journey timeline | Historical events and comparisons | Understand progress and patterns over years | Measurements, sessions, reflections and milestones |
| TwiN matching | Compatible buddy suggestions | Find relevant accountability and companionship | Accepted connection, sessions and mutual feedback |
| Purchase journey | Link purchases to goals and outcomes | Understand whether a product delivered value | Order, usage, maintenance and user reflection |
| Community support | Contributions and acknowledgements | Remember who helped during difficult periods | Reactions, comments, support records and user attribution |
| AI memory | Authorized longitudinal summaries | Receive context-aware guidance without repeating the full history | Provenance-linked journey records |

Benefits must never be fabricated. Marketing claims must be supported by product behavior and evidence.

## AI Use

AI may help users:

- retrieve relevant moments from long histories;
- summarize trends and turning points;
- identify possible patterns;
- prepare anniversary or legacy stories;
- suggest compatible TwiNs;
- explain product history and possible next actions;
- surface people who contributed to a goal;
- recommend questions for reflection.

AI must:

- use only authorized data;
- disclose uncertainty;
- preserve source provenance;
- distinguish user statements from measured facts;
- avoid medical, causal or safety claims beyond available evidence;
- respect deleted, hidden or revoked data;
- never silently expand sharing scopes.

## Privacy and Data Governance

Journey memory is highly sensitive. Therefore:

- private is the default for personal journey records;
- sharing is explicit and granular;
- visibility can differ per item and per relationship;
- consent changes must propagate to derived views and AI retrieval;
- exact location requires a dedicated consent scope;
- sensitive reflections require enhanced access controls;
- users need export, correction and deletion tools;
- audit records must capture access and important sharing changes;
- retention must be documented by data category;
- derived AI memories must be invalidated when source access is revoked.

## Domain Responsibilities

- **Journey Engine:** timeline, moments, reflections, provenance, support attribution and legacy views.
- **Community Engine:** posts, conversations, reactions, discovery, moderation and social graph surfaces.
- **TwiN capability:** relationship lifecycle, matching, scopes, safety controls and shared activity orchestration.
- **Gym Engine:** workouts, sessions, measurements, plans and performance truth.
- **Commerce Engine:** orders, ownership, warranties, maintenance, transfers and lifecycle truth for products.
- **Coach Engine:** professional coaching relationships and interventions.
- **Media Engine:** secure photos, videos and file lifecycle.
- **Integration Engine:** calendars, social platforms, video providers and external gyms.
- **AI Engine:** authorized retrieval, explanation, matching assistance and contextual intelligence.
- **Analytics Engine:** measurable outcomes and product benefit evidence.

## Consequences

### Positive

- FitConnect can preserve years of meaningful context.
- Community relationships become part of the user's remembered growth story.
- Commerce gains a value and lifecycle dimension beyond transactions.
- AI can become context-aware and explainable.
- The TwiN System creates strong network effects and real-world utility.
- Product design becomes benefit-led rather than feature-led.

### Costs and risks

- Long-term storage and retrieval are technically demanding.
- Privacy, consent and deletion are more complex.
- Matching and meetups introduce trust and safety obligations.
- Historical records require correction and provenance mechanisms.
- AI summaries can mislead unless carefully grounded.
- The platform must prevent social pressure, stalking, harassment and unsafe meetups.

These costs are accepted because Journey Memory and TwiN connections are central to FitConnect's long-term value.

## Implementation Direction

Before implementation, produce:

1. Journey Engine specification;
2. TwiN System product and safety specification;
3. benefits catalogue per engine;
4. privacy and consent matrix;
5. event taxonomy and provenance model;
6. retention and deletion matrix;
7. RLS and permission matrix;
8. API contracts;
9. threat model;
10. staged delivery roadmap.

No TwiN meetup, matching or long-term AI memory feature may ship without moderation, consent, block/report and deletion requirements being complete.