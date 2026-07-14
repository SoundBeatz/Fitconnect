"use client";

import { useMemo, useState } from "react";

type FormState = {
  roomType: string;
  length: string;
  width: string;
  height: string;
  users: string;
  budget: string;
  goals: string[];
  style: string;
};

const goalOptions = ["Kracht & spiermassa", "Afvallen & conditie", "Boksen & vechtsport", "Mobiliteit & herstel", "Gezin & meerdere gebruikers"];

export default function ConfiguratorPage() {
  const [form, setForm] = useState<FormState>({ roomType: "Binnenruimte", length: "", width: "", height: "", users: "1", budget: "€5.000 – €10.000", goals: [], style: "Modern & strak" });

  const area = useMemo(() => {
    const length = Number(form.length.replace(",", "."));
    const width = Number(form.width.replace(",", "."));
    return length > 0 && width > 0 ? (length * width).toFixed(1) : "—";
  }, [form.length, form.width]);

  const toggleGoal = (goal: string) => setForm((current) => ({
    ...current,
    goals: current.goals.includes(goal) ? current.goals.filter((item) => item !== goal) : [...current.goals, goal],
  }));

  const mailBody = encodeURIComponent(`Nieuwe FitConnect-aanvraag\n\nRuimte: ${form.roomType}\nAfmetingen: ${form.length || "?"} x ${form.width || "?"} x ${form.height || "?"} meter\nOppervlakte: ${area} m²\nAantal gebruikers: ${form.users}\nBudget: ${form.budget}\nDoelen: ${form.goals.join(", ") || "Nog niet gekozen"}\nStijl: ${form.style}`);

  return (
    <main className="config-page">
      <header className="nav-wrap">
        <a className="brand" href="/"><span className="brand-mark">FC</span><span>FitConnect</span></a>
        <nav><a href="/">Home</a><a className="nav-cta" href="#start">Start ontwerp</a></nav>
      </header>

      <section className="config-hero">
        <p className="eyebrow">FitConnect Homegym Configurator</p>
        <h1>Vertel ons wat u nodig heeft. Wij maken er een compleet plan van.</h1>
        <p>Vul de eerste kenmerken van uw ruimte en trainingsdoelen in. U ontvangt daarna persoonlijk advies over indeling, apparatuur, vloer, verlichting, ventilatie en investering.</p>
      </section>

      <section className="config-layout" id="start">
        <form className="config-form" onSubmit={(event) => event.preventDefault()}>
          <fieldset>
            <legend>1. De ruimte</legend>
            <label>Type ruimte<select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })}><option>Binnenruimte</option><option>Garage</option><option>Zolder</option><option>Tuinhuis</option><option>Outdoor / overkapping</option><option>PT-studio of bedrijf</option></select></label>
            <div className="input-row">
              <label>Lengte (m)<input inputMode="decimal" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} placeholder="3,70" /></label>
              <label>Breedte (m)<input inputMode="decimal" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} placeholder="2,30" /></label>
              <label>Hoogte (m)<input inputMode="decimal" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="2,40" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Gebruik en doelstelling</legend>
            <div className="choice-grid">{goalOptions.map((goal) => <button type="button" className={form.goals.includes(goal) ? "choice active" : "choice"} onClick={() => toggleGoal(goal)} key={goal}>{goal}</button>)}</div>
            <div className="input-row two">
              <label>Aantal gebruikers<select value={form.users} onChange={(e) => setForm({ ...form, users: e.target.value })}><option>1</option><option>2</option><option>3–4</option><option>5 of meer</option></select></label>
              <label>Gewenste uitstraling<select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}><option>Modern & strak</option><option>Industrieel</option><option>Warm & luxe</option><option>Professionele studio</option><option>Nog te bepalen</option></select></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Investeringsniveau</legend>
            <label>Beschikbaar budget<select value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}><option>Tot €5.000</option><option>€5.000 – €10.000</option><option>€10.000 – €20.000</option><option>€20.000 – €40.000</option><option>€40.000+</option><option>Eerst advies nodig</option></select></label>
          </fieldset>
        </form>

        <aside className="config-summary">
          <p className="eyebrow">Uw eerste projectsamenvatting</p>
          <div className="area-number"><strong>{area}</strong><span>m² trainingsruimte</span></div>
          <dl><div><dt>Ruimte</dt><dd>{form.roomType}</dd></div><div><dt>Gebruikers</dt><dd>{form.users}</dd></div><div><dt>Budget</dt><dd>{form.budget}</dd></div><div><dt>Stijl</dt><dd>{form.style}</dd></div></dl>
          <p className="summary-note">Na uw aanvraag controleert FitConnect persoonlijk wat technisch, praktisch en binnen uw budget het beste werkt.</p>
          <a className="button button-primary full-button" href={`mailto:info@fitconnect.nl?subject=FitConnect%20homegym%20configuratie&body=${mailBody}`}>Verstuur mijn aanvraag</a>
          <small>Vrijblijvend. Geen automatische standaardofferte.</small>
        </aside>
      </section>
    </main>
  );
}
