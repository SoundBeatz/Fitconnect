(()=>{
  const form=document.getElementById('configForm');
  const areaEl=document.getElementById('area');
  const feedback=document.getElementById('feedback');
  if(!form||!areaEl)return;

  const field=name=>form.elements.namedItem(name);
  const value=name=>{
    const control=field(name);
    return control&&typeof control.value==='string'?control.value.trim():'';
  };
  const numberValue=name=>{
    const parsed=Number.parseFloat(value(name).replace(',','.'));
    return Number.isFinite(parsed)&&parsed>0?parsed:null;
  };
  const checkedGoals=()=>[...form.querySelectorAll('input[name="goals"]:checked')].map(item=>item.value);
  const setText=(id,text)=>{const element=document.getElementById(id);if(element)element.textContent=text};
  const formatDimension=number=>number===null?'—':new Intl.NumberFormat('nl-NL',{maximumFractionDigits:2}).format(number);

  function updateSummary(){
    const length=numberValue('length');
    const width=numberValue('width');
    const height=numberValue('height');
    const area=length!==null&&width!==null?length*width:null;
    const goals=checkedGoals();

    areaEl.textContent=area===null?'—':new Intl.NumberFormat('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1}).format(area);
    setText('summaryRoom',value('roomType')||'Nog niet gekozen');
    setText('summaryDimensions',`${formatDimension(length)} × ${formatDimension(width)} × ${formatDimension(height)} m`);
    setText('summaryUsers',value('users')||'Nog niet gekozen');
    setText('summaryGoals',goals.length?goals.join(' · '):'Nog niet gekozen');
    setText('summaryStyle',value('style')||'Nog niet gekozen');
    setText('summaryBudget',value('budget')||'Nog niet gekozen');
    setText('summaryTimeline',value('timeline')||'Nog niet gekozen');
  }

  form.addEventListener('input',updateSummary);
  form.addEventListener('change',updateSummary);

  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const goals=checkedGoals().join(', ')||'Nog niet gekozen';
    const body=`Nieuwe FitConnect-aanvraag\n\nNaam: ${value('name')}\nE-mail: ${value('email')}\nTelefoon: ${value('phone')||'Niet ingevuld'}\nPostcode: ${value('postcode')||'Niet ingevuld'}\n\nRuimte: ${value('roomType')}\nAfmetingen: ${value('length')||'?'} x ${value('width')||'?'} x ${value('height')||'?'} meter\nOppervlakte: ${areaEl.textContent} m²\nAantal gebruikers: ${value('users')}\nBudget: ${value('budget')}\nDoelen: ${goals}\nStijl: ${value('style')}\nGewenste planning: ${value('timeline')}\n\nAanvullende informatie:\n${value('notes')||'Geen aanvullende informatie'}`;
    feedback.hidden=false;
    feedback.className='form-feedback success';
    feedback.textContent='Uw e-mailprogramma wordt geopend met de volledige aanvraag. Controleer de gegevens en druk daarna op verzenden.';
    window.location.href=`mailto:info@fitconnect.nl?subject=${encodeURIComponent('FitConnect homegym configuratie')}&body=${encodeURIComponent(body)}`;
  });

  updateSummary();
})();