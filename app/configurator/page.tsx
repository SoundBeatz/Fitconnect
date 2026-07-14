"use client";

import { FormEvent, useMemo, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  postcode: string;
  roomType: string;
  length: string;
  width: string;
  height: string;
  users: string;
  budget: string;
  goals: string[];
  style: string;
  timeline: string;
  notes: string;
  website: string;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

const goalOptions = [
  "Kracht & spiermassa",
  "Afvallen & conditie",
  "Boksen & vechtsport",
  "Mobiliteit & herstel",
  "Gezin & meerdere gebruikers",
];

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  postcode: "",
  roomType: "Binnenruimte",
  length: "",
  width: "",
  height: "",
  users: "1",
  budget: "€5.000 – €10.000",
  goals: [],
  style: "Modern & strak",
  timeline: "Binnen 1–3 maanden",
  notes: "",
  website: "",
};

export default function ConfiguratorPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");

  const area = useMemo(() => {
    const length = Number(form.length.replace(",", "."));
    const width = Number(form.width.replace(",", "."));
    return length > 0 && width > 0 ? (length * width).toFixed(1) : "—";
  }, [form.length, form.width]);

  const toggleGoal = (goal: string) =>
    setForm((current) => ({
      ...current,
      goals: current.goals.includes(goal)
        ? current.goals.filter((item) => item !== goal)
        : [...current.goals, goal],
    }));

  const canSubmit = Boolean(form.name.trim() && form.email.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitState === "submitting") return;

    setSubmitState("submitting");
    setFeedback("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Uw aanvraag kon niet worden verstuurd.");
      }

      setSubmitState("success");
      setFeedback(result.message || "Bedankt. Uw aanvraag is veilig ontvangen.");
      setForm(initialForm);
    } catch (error) {
      setSubmitState("error");
      setFeedback(error instanceof Error ? error.message : "Er ging iets mis. Probeer het opnieuw.");
    }
  }

  return (
    <main className="config-page">
      <header className="nav-wrap">
        <a className="brand" href="/" aria-label="FitConnect home">
          <span className="brand-mark">FC</span><span>FitConnect</span>
        </a>
        <nav aria-label="Configurator navigatie"><a href="/">Home</a><a className="nav-cta" href="#start">Start ontwerp</a></nav>
      </header>

      <section className="config-hero">
        <p className="eyebrow">FitConnect Homegym Configurator</p>
        <h1>Vertel ons wat u nodig heeft. Wij maken er een compleet plan van.</h1>
        <p>Vul de eerste kenmerken van uw ruimte en trainingsdoelen in. U ontvangt persoonlijk advies over indeling, apparatuur, vloer, verlichting, ventilatie en investering.</p>
      </section>

      <section className="config-layout" id="start">
        <form className="config-form" onSubmit={handleSubmit}>
          <input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} name="website" />

          <fieldset>
            <legend>1. Uw gegevens</legend>
            <div className="input-row two no-top-margin">
              <label>Naam *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Uw naam" /></label>
              <label>E-mailadres *<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="naam@voorbeeld.nl" /></label>
              <label>Telefoonnummer<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="06 12345678" /></label>
              <label>Postcode<input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} placeholder="1234 AB" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>2. De ruimte</legend>
            <label>Type ruimte<select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })}><option>Binnenruimte</option><option>Garage</option><option>Zolder</option><option>Tuinhuis</option><option>Outdoor / overkapping</option><option>PT-studio of bedrijf</option></select></label>
            <div className="input-row">
              <label>Lengte (m)<input inputMode="decimal" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} placeholder="3,70" /></label>
              <label>Breedte (m)<input inputMode="decimal" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} placeholder="2,30" /></label>
              <label>Hoogte (m)<input inputMode="decimal" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="2,40" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Gebruik en doelstelling</legend>
            <div className="choice-grid">{goalOptions.map((goal) => <button type="button" className={form.goals.includes(goal) ? "choice active" : "choice"} onClick={() => toggleGoal(goal)} key={goal}>{goal}</button>)}</div>
            <div className="input-row two">
              <label>Aantal gebruikers<select value={form.users} onChange={(e) => setForm({ ...form, users: e.target.value })}><option>1</option><option>2</option><option>3–4</option><option>5 of meer</option></select></label>
              <label>Gewenste uitstraling<select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}><option>Modern & strak</option><option>Industrieel</option><option>Warm & luxe</option><option>Professionele studio</option><option>Nog te bepalen</option></select></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>4. Investering en planning</legend>
            <div className="input-row two no-top-margin">
              <label>Beschikbaar budget<select value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}><option>Tot €5.000</option><option>€5.000 – €10.000</option><option>€10.000 – €20.000</option><option>€20.000 – €40.000</option><option>€40.000+</option><option>Eerst advies nodig</option></select></label>
              <label>Gewenste realisatie<select value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })}><option>Zo snel mogelijk</option><option>Binnen 1–3 maanden</option><option>Binnen 3–6 maanden</option><option>Later dit jaar</option><option>Alleen oriënteren</option></select></label>
            </div>
            <label className="notes-label">Vertel kort iets over uw wensen<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Bijvoorbeeld: bestaande vloer, favoriete apparatuur, beperkingen in de ruimte of specifieke trainingswensen." /></label>
          </fieldset>

          <button className="mobile-submit button button-primary" type="submit" disabled={!canSubmit || submitState === "submitting"}>{submitState === "submitting" ? "Aanvraag versturen…" : "Verstuur mijn aanvraag"}</button>
        </form>

        <aside className="config-summary">
          <p className="eyebrow">Uw eerste projectsamenvatting</p>
          <div className="area-number"><strong>{area}</strong><span>m² trainingsruimte</span></div>
          <dl><div><dt>Ruimte</dt><dd>{form.roomType}</dd></div><div><dt>Gebruikers</dt><dd>{form.users}</dd></div><div><dt>Budget</dt><dd>{form.budget}</dd></div><div><dt>Planning</dt><dd>{form.timeline}</dd></div></dl>
          <p className="summary-note">Na uw aanvraag controleert FitConnect persoonlijk wat technisch, praktisch en binnen uw budget het beste werkt.</p>
          <button className="button button-primary full-button" type="submit" form="fitconnect-form" disabled={!canSubmit || submitState === "submitting"} onClick={() => document.querySelector<HTMLFormElement>(".config-form")?.requestSubmit()}>{submitState === "submitting" ? "Aanvraag versturen…" : "Verstuur mijn aanvraag"}</button>
          {!canSubmit && <small>Vul minimaal uw naam en e-mailadres in.</small>}
          {canSubmit && submitState === "idle" && <small>Vrijblijvend. Uw gegevens worden veilig verwerkt.</small>}
          {feedback && <p className={`form-feedback ${submitState}`}>{feedback}</p>}
        </aside>
      </section>
    </main>
  );
}
