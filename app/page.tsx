const services = [
  ["3D-ontwerp", "Een slimme indeling op basis van uw ruimte, doelen, gebruikers en budget."],
  ["Vloer & afwerking", "Sportvloeren, wandbescherming, spiegels en een afwerking die tegen intensief gebruik kan."],
  ["Licht & klimaat", "Functionele verlichting, sfeerlicht, ventilatie en advies over frisse lucht en temperatuur."],
  ["Apparatuur", "Merken en modellen van betrouwbaar budgetniveau tot volledig high-end, onafhankelijk geselecteerd."],
  ["Montage & installatie", "Veilige plaatsing, bevestiging, afstelling en een complete gebruiksklare oplevering."],
  ["Training & voeding", "Persoonlijke uitleg, doelgericht trainingsadvies en deskundige begeleiding rond voeding en herstel."],
];

const steps = [
  ["01", "Inventarisatie", "We bespreken de ruimte, wensen, doelstellingen, gebruikers en investering."],
  ["02", "Ontwerp", "U ontvangt een doordachte indeling en waar passend een duidelijke 3D-visualisatie."],
  ["03", "Realisatie", "FitConnect verzorgt levering, vloer, verlichting, opslag, montage en afwerking."],
  ["04", "Eerste training", "We stellen alles af, leggen de apparatuur uit en zorgen dat u veilig kunt beginnen."],
];

const expertise = [
  "Meer dan 20 jaar gediplomeerd personal trainer",
  "Meer dan 25 jaar ervaring als bokstrainer",
  "Orthomoleculair specialist en voedingsdeskundige",
  "Gecertificeerd vechtsportinstructeur",
  "Actuele BHV-certificering",
  "Volledig verzekerd voor professionele dienstverlening",
];

export default function Home() {
  return (
    <main>
      <header className="nav-wrap">
        <a className="brand" href="#top" aria-label="FitConnect home">
          <span className="brand-mark">FC</span>
          <span>FitConnect</span>
        </a>
        <nav aria-label="Hoofdnavigatie">
          <a href="#oplossingen">Oplossingen</a>
          <a href="#werkwijze">Werkwijze</a>
          <a href="#expertise">Expertise</a>
          <a href="/configurator" className="nav-cta">Start uw project</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-glow" />
        <div className="hero-copy">
          <p className="eyebrow">Complete homegyms · van A tot Z</p>
          <h1>Van lege ruimte naar een gym die écht bij u past.</h1>
          <p className="hero-text">
            FitConnect ontwerpt, levert en installeert complete trainingsruimtes op maat. Van vloer,
            verlichting en klimaat tot apparatuur, opslag en persoonlijke begeleiding.
          </p>
          <div className="actions">
            <a className="button button-primary" href="/configurator">Start mijn homegym</a>
            <a className="button button-secondary" href="#werkwijze">Bekijk onze werkwijze</a>
          </div>
          <div className="proof-row">
            <div><strong>±150</strong><span>gyms gerealiseerd</span></div>
            <div><strong>20+ jaar</strong><span>trainingsspecialist</span></div>
            <div><strong>100%</strong><span>maatwerk</span></div>
          </div>
        </div>
        <div className="hero-panel" aria-label="FitConnect totaalconcept">
          <div className="panel-top"><span>FITCONNECT 360°</span><span>01 — 06</span></div>
          <div className="room-visual">
            <div className="light-line" />
            <div className="rack"><i /><i /><b /></div>
            <div className="bench" />
            <div className="weights"><i /><i /><i /><i /></div>
          </div>
          <div className="panel-bottom">
            <span>DESIGN</span><span>BUILD</span><span>COACH</span><span>CARE</span>
          </div>
        </div>
      </section>

      <section className="statement">
        <p>Een goede homegym begint niet met een apparaat.</p>
        <h2>Het begint met de juiste vragen.</h2>
      </section>

      <section className="section" id="oplossingen">
        <div className="section-heading">
          <p className="eyebrow">Alles onder één dak</p>
          <h2>Geen losse producten. Eén compleet plan.</h2>
          <p>Iedere keuze wordt afgestemd op ruimte, trainingsdoel, comfort, veiligheid en toekomstig gebruik.</p>
        </div>
        <div className="service-grid">
          {services.map(([title, text], index) => (
            <article className="service-card" key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dark-section" id="werkwijze">
        <div className="section-heading light">
          <p className="eyebrow">Van idee tot eerste training</p>
          <h2>Een helder proces. Eén aanspreekpunt.</h2>
        </div>
        <div className="steps">
          {steps.map(([number, title, text]) => (
            <article className="step" key={number}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section split" id="expertise">
        <div>
          <p className="eyebrow">De expertise achter FitConnect</p>
          <h2>Gebouwd vanuit praktijkervaring, niet vanuit een webshop.</h2>
          <p className="lead">
            Apparatuur verkopen is één ding. Een veilige, prettige en doelgerichte trainingsruimte bouwen
            vraagt kennis van training, ergonomie, gebruik, installatie, voeding en begeleiding.
          </p>
          <ul className="check-list">
            {expertise.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <aside className="quote-card">
          <p>“Ik kijk niet alleen naar wat er in een ruimte past, maar vooral naar wie er gaat trainen, hoe die persoon beweegt en wat de ruimte iedere dag moet opleveren.”</p>
          <div><strong>Paul Roelofs</strong><span>Oprichter FitConnect</span></div>
        </aside>
      </section>

      <section className="section compact-section">
        <div className="compact-card">
          <div>
            <p className="eyebrow">Weinig ruimte?</p>
            <h2>Geen probleem.</h2>
            <p>Een garage, zolder, tuinhuis of kleine kamer kan vaak veel meer bieden dan u denkt. Wij halen het maximale uit iedere vierkante meter.</p>
            <a className="button button-primary" href="/configurator">Bereken mijn mogelijkheden</a>
          </div>
          <div className="dimensions"><span>2.3 M</span><b>×</b><span>3.7 M</span><small>SLIM ONTWORPEN</small></div>
        </div>
      </section>

      <section className="cta-section" id="contact">
        <p className="eyebrow">Uw ruimte. Uw doelen. Uw gym.</p>
        <h2>Klaar om uw homegym professioneel aan te pakken?</h2>
        <p>Start met de configurator en vertel ons over de ruimte, uw doelen, gebruikers en beschikbare investering.</p>
        <a className="button button-dark" href="/configurator">Start de configurator</a>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark">FC</span><span>FitConnect</span></a>
        <p>Complete homegyms op maat · ontwerp · levering · installatie · begeleiding</p>
        <p>© {new Date().getFullYear()} FitConnect</p>
      </footer>
    </main>
  );
}
