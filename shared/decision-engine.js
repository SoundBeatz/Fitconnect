(function(){
  const RED_FLAGS=new Set(['heart','dizziness','medical_restriction']);
  const LOW_IMPACT_LIMITS=new Set(['knee','hip','ankle','back','balance']);
  const LABELS={
    fat_loss:'gewicht verliezen',health:'fitter en gezonder leven',condition:'de conditie verbeteren',strength:'sterker worden',mobility:'soepeler bewegen',vitality:'vitaal ouder worden',boxing:'boksen leren',selection:'voorbereiden op politie of defensie'
  };
  const clean=value=>Array.isArray(value)?value.filter(item=>item&&item!=='none'):[];
  const hasAny=(items,set)=>items.some(item=>set.has(item));

  function evaluate(input={}){
    const limits=clean(input.limitations);
    const health=clean(input.health_flags);
    const barriers=clean(input.confidence_barriers);
    const safetyReviewRequired=hasAny(health,RED_FLAGS);
    const lowFitness=['very_low','low'].includes(input.fitness_self_rating);
    const noExperience=['none','beginner'].includes(input.training_experience);
    const mobilityRisk=hasAny(limits,LOW_IMPACT_LIMITS);
    const lowImpact=safetyReviewRequired||lowFitness||mobilityRisk;

    let performanceProfile='Balanced Builder';
    let startLevel=noExperience?'Basis':'Opbouw';
    let recommendedImpact=lowImpact?'Laag':'Gemiddeld';

    if(lowFitness||limits.includes('balance')){
      performanceProfile='Rustige Starter';
      startLevel='Start';
    }else if(input.primary_goal==='strength'&&['good','excellent'].includes(input.fitness_self_rating)){
      performanceProfile='Strength Builder';
      startLevel=input.training_experience==='advanced'?'Gevorderd':'Opbouw';
      recommendedImpact='Opbouwend';
    }else if(input.primary_goal==='condition'){
      performanceProfile='Condition Builder';
    }else if(input.primary_goal==='vitality'){
      performanceProfile='Vitality Builder';
      recommendedImpact='Laag';
    }else if(input.primary_goal==='mobility'){
      performanceProfile='Mobility Builder';
      recommendedImpact='Laag';
    }else if(input.primary_goal==='boxing'){
      performanceProfile='Boxing Starter';
    }

    const requestedDays=Number(input.training_days||3);
    const requestedMinutes=Number(input.session_minutes||30);
    const recommendedDays=Math.max(1,Math.min(requestedDays,lowImpact?3:5));
    const recommendedMinutes=Math.max(10,Math.min(requestedMinutes,lowImpact?30:60));

    const reasons=[];
    reasons.push(`Uw hoofddoel is ${LABELS[input.primary_goal]||'persoonlijke vooruitgang'}.`);
    if(lowFitness)reasons.push('Uw huidige conditie vraagt om een rustige opbouw met een lage instapdrempel.');
    if(mobilityRisk)reasons.push('De gemelde bewegingsaandachtspunten vragen om stabiele oefeningen zonder sprongen of plotselinge richtingswisselingen.');
    if(noExperience)reasons.push('Techniek, controle en regelmaat krijgen voorrang boven zware belasting.');
    if(barriers.includes('time'))reasons.push('Het plan blijft kort genoeg om ook op drukke dagen uitvoerbaar te zijn.');
    if(barriers.includes('injury_fear'))reasons.push('We kiezen oefeningen die eenvoudig te stoppen, aan te passen en controleren zijn.');
    if(safetyReviewRequired)reasons.unshift('Er is een gezondheidsmelding waarvoor eerst professioneel overleg nodig is voordat intensiteit wordt opgebouwd.');

    let trainingDirection='Volledige basistraining met rustige conditie, mobiliteit en eenvoudige krachtbewegingen.';
    let firstStep=`Begin ${recommendedDays} keer per week met ${recommendedMinutes} minuten. Houd de belasting beheersbaar en stop ruim vóór uitputting.`;
    let performanceKit=['Fitnessmat','Lichte weerstandsband'];
    let avoid=['Maximale inspanning','Training tot volledige uitputting'];

    if(lowImpact){
      trainingDirection='Lage-impact conditie, zittende of gesteunde basiskracht en gecontroleerde mobiliteit.';
      firstStep=`Start ${recommendedDays} keer per week met ${recommendedMinutes} minuten lage-impacttraining. Wissel rustig fietsen of wandelen af met eenvoudige, stabiele krachtoefeningen.`;
      performanceKit=['Fitnessmat','Lichte weerstandsband','2 × 1 kg dumbbells','2 × 2 kg dumbbells','Stevige stoel'];
      avoid=['Springtouw en sprongen','Hardlopen of sprinten','Snelle draaibewegingen','Onbegeleid zwaar trainen'];
    }
    if(input.primary_goal==='strength'&&!lowImpact){
      trainingDirection='Technische basiskracht met progressieve belasting en voldoende herstel.';
      performanceKit=['Fitnessmat','Weerstandsband','Verstelbare dumbbells of lichte dumbbellset'];
      avoid=['Te snelle gewichtsopbouw','Techniek opofferen voor herhalingen'];
    }
    if(input.primary_goal==='condition'&&!lowImpact){
      trainingDirection='Rustige duurtraining met korte, beheersbare intensiteitsblokken.';
      performanceKit=['Goede trainingsschoenen','Fitnessmat','Optioneel: hometrainer of roeitrainer'];
      avoid=['Iedere training maximaal gaan','Te grote tempoverhogingen'];
    }
    if(input.primary_goal==='boxing'){
      trainingDirection=lowImpact?'Zittende of stabiele bokstechniek, coördinatie en rustige conditie.':'Basistechniek, voetenwerk, coördinatie en beheersbare conditie.';
      performanceKit=['Fitnessmat','Lichte weerstandsband','Bokshandschoenen','Optioneel: lichte bokszak of slimme bokspaal'];
      if(lowImpact)avoid.push('Snel voetenwerk zonder steun');
    }
    if(safetyReviewRequired){
      firstStep='Bespreek eerst met een arts of behandelaar welke inspanning passend is. Daarna kan FitConnect een aangepast laag-impactplan aanbieden.';
      trainingDirection='Voorlopig alleen professioneel goedgekeurde, lichte beweging.';
      performanceKit=['Nog geen aankoop nodig vóór professioneel akkoord'];
      avoid=['Intensieve training zonder medische toestemming'];
    }

    return {
      version:'1.0.0',
      performanceProfile,startLevel,recommendedImpact,recommendedDays,recommendedMinutes,
      safetyReviewRequired,reasons,trainingDirection,firstStep,performanceKit,avoid,
      summary:`FitConnect adviseert een ${recommendedImpact.toLowerCase()} startniveau met ${recommendedDays} trainingen van maximaal ${recommendedMinutes} minuten.`
    };
  }

  window.FitConnectDecisionEngine={evaluate,version:'1.0.0'};
})();