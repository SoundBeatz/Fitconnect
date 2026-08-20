(()=>{
  'use strict';
  const API='https://lwpiqshyqzsgwejvmbyo.supabase.co/rest/v1';
  const KEY='sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj';
  const headers={apikey:KEY,Authorization:`Bearer ${KEY}`};
  const state={sport:null,goal:null,body:null};
  const cache={sports:[],goals:[],body:[]};

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const byOrder=(a,b)=>(a.sort_order??0)-(b.sort_order??0)||String(a.name).localeCompare(String(b.name),'nl');

  async function get(path){
    const response=await fetch(`${API}/${path}`,{headers});
    if(!response.ok)throw new Error(`Supabase ${response.status}`);
    return response.json();
  }

  function button(item,type,subtitle=''){
    const selected=state[type]?.slug===item.slug;
    return `<button type="button" class="option-button${selected?' is-selected':''}" data-type="${type}" data-slug="${esc(item.slug)}"><strong>${esc(item.name)}</strong>${subtitle?`<small>${esc(subtitle)}</small>`:''}</button>`;
  }

  function renderSports(){
    $('sportsGrid').innerHTML=cache.sports.sort(byOrder).map(item=>button(item,'sport',item.slug==='strength-training'?'Machines, vrije gewichten en krachtontwikkeling':'' )).join('');
  }
  function renderGoals(){
    $('goalsGrid').innerHTML=cache.goals.sort(byOrder).map(item=>button(item,'goal')).join('');
  }
  function renderBody(){
    const parents=cache.body.filter(item=>!item.parent_id).sort(byOrder);
    const html=[];
    parents.forEach(parent=>{
      html.push(button(parent,'body'));
      const children=cache.body.filter(item=>item.parent_id===parent.id).sort(byOrder);
      if(children.length){
        html.push(`<div class="subregion-label">${esc(parent.name)} specifiek</div>`);
        children.forEach(child=>html.push(button(child,'body'));
      }
    });
    $('bodyGrid').innerHTML=html.join('');
  }

  function bindOptions(){
    document.querySelectorAll('.option-button[data-type]').forEach(node=>node.addEventListener('click',()=>{
      const type=node.dataset.type;
      const source=type==='sport'?cache.sports:type==='goal'?cache.goals:cache.body;
      state[type]=source.find(item=>item.slug===node.dataset.slug)||null;
      renderSports();renderGoals();renderBody();bindOptions();renderSelection();
      if(state.sport&&state.goal&&state.body)loadRecommendations();
    }));
  }

  function renderSelection(){
    $('selectedSport').textContent=state.sport?.name||'Nog niet gekozen';
    $('selectedGoal').textContent=state.goal?.name||'Nog niet gekozen';
    $('selectedBody').textContent=state.body?.name||'Nog niet gekozen';
    const complete=state.sport&&state.goal&&state.body;
    $('resultTitle').textContent=complete?'Jouw trainingsroute staat klaar':'Maak drie keuzes';
    if(!complete){
      $('recommendations').hidden=true;
      $('recommendationState').hidden=false;
      $('recommendationState').textContent='Zodra je keuzes compleet zijn, verschijnt hier de beste trainingsroute.';
    }
  }

  async function loadRecommendations(){
    const status=$('recommendationState');
    const wrap=$('recommendations');
    status.hidden=false;wrap.hidden=true;status.textContent='Trainingsroute berekenen…';
    try{
      const query=`rpc/training_configurator_options`;
      const response=await fetch(`${API}/${query}`,{
        method:'POST',headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify({p_sport_slug:state.sport.slug,p_goal_slug:state.goal.slug,p_body_region_slug:state.body.slug})
      });
      if(!response.ok)throw new Error(`Recommendation ${response.status}`);
      const rows=await response.json();
      if(!rows.length){
        status.textContent='Voor deze combinatie is de trainingskennisbank nog niet volledig gevuld. Kies een bredere lichaamsregio of een andere combinatie.';
        return;
      }
      const unique=[];const seen=new Set();
      rows.forEach(row=>{const key=`${row.exercise_slug}:${row.equipment_slug}`;if(!seen.has(key)){seen.add(key);unique.push(row)}});
      $('recommendationList').innerHTML=unique.slice(0,12).map(row=>`<article class="recommendation-card"><strong>${esc(row.exercise_name)}</strong><span>${esc(row.equipment_name)} · ${esc(row.equipment_group)}</span></article>`).join('');
      const focus=encodeURIComponent(state.body.name);
      $('shopCta').href=`../shop/?q=${focus}`;
      status.hidden=true;wrap.hidden=false;
    }catch(error){
      console.error(error);status.hidden=false;wrap.hidden=true;status.textContent='De trainingsroute kon niet worden geladen. Probeer het opnieuw.';
    }
  }

  function reset(){
    state.sport=state.goal=state.body=null;
    renderSports();renderGoals();renderBody();bindOptions();renderSelection();
    $('shopCta').href='../shop/';
  }

  async function init(){
    try{
      const [sports,goals,body]=await Promise.all([
        get('sports?select=id,slug,name,description,sort_order&is_active=eq.true&order=sort_order.asc'),
        get('training_goals?select=id,slug,name,description,sort_order&is_active=eq.true&order=sort_order.asc'),
        get('body_regions?select=id,parent_id,slug,name,description,sort_order&is_active=eq.true&order=sort_order.asc')
      ]);
      cache.sports=sports;cache.goals=goals;cache.body=body;
      renderSports();renderGoals();renderBody();bindOptions();renderSelection();
      $('resetConfigurator')?.addEventListener('click',reset);
    }catch(error){
      console.error(error);
      ['sportsGrid','goalsGrid','bodyGrid'].forEach(id=>$(id).innerHTML='<div class="error-state">De configuratorgegevens konden niet worden geladen.</div>');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
