(()=>{
  'use strict';
  const state={equipment:[],exercises:[],productId:null,pending:null,loaded:false};
  const client=()=>window.getFitConnectSupabase?.();
  const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function style(){
    if(document.getElementById('trainingProductIntelligenceStyles'))return;
    const node=document.createElement('style');node.id='trainingProductIntelligenceStyles';node.textContent=`
      .training-intelligence{margin:22px 0;padding:20px;border:1px solid var(--line);border-radius:18px;background:#faf9f6}
      .training-intelligence-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
      .training-intelligence-head h3{margin:3px 0 4px}.training-intelligence-head p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
      .training-intelligence-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.training-tag-box{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px;min-width:0}
      .training-tag-box>strong{display:block;margin-bottom:4px}.training-tag-box>small{display:block;color:var(--muted);margin-bottom:12px;line-height:1.4}
      .training-tag-list{display:flex;flex-wrap:wrap;gap:8px;max-height:220px;overflow:auto;padding-right:4px}.training-tag{display:inline-flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:12px;cursor:pointer}.training-tag:has(input:checked){background:#111214;color:#fff;border-color:#111214}.training-tag input{margin:0}
      .training-intelligence-summary{margin-top:14px;padding:12px 14px;border-radius:12px;background:#f1f0ec;font-size:12px;line-height:1.55}.training-intelligence-summary strong{display:block;margin-bottom:3px}.training-intelligence-status{font-size:12px;color:var(--muted);white-space:nowrap}
      @media(max-width:760px){.training-intelligence-grid{grid-template-columns:1fr}.training-intelligence-head{display:block}.training-intelligence-status{display:block;margin-top:8px}}
    `;document.head.appendChild(node);
  }

  async function loadReference(){
    if(state.loaded)return;
    const db=client();if(!db)throw new Error('Supabase client ontbreekt');
    const [equipmentResult,exerciseResult]=await Promise.all([
      db.from('equipment_types').select('id,slug,name,equipment_group,sort_order').eq('is_active',true).order('equipment_group').order('sort_order'),
      db.from('exercises').select('id,slug,name,movement_pattern,sort_order').eq('is_active',true).order('sort_order')
    ]);
    if(equipmentResult.error)throw equipmentResult.error;if(exerciseResult.error)throw exerciseResult.error;
    state.equipment=equipmentResult.data||[];state.exercises=exerciseResult.data||[];state.loaded=true;
  }

  function ensurePanel(form){
    let panel=form.querySelector('[data-training-intelligence]');if(panel)return panel;
    style();panel=document.createElement('section');panel.className='training-intelligence';panel.dataset.trainingIntelligence='';
    panel.innerHTML=`<div class="training-intelligence-head"><div><p class="eyebrow">Training Intelligence</p><h3>Wat kan de klant met dit product trainen?</h3><p>Koppel het product aan equipmenttypes en oefeningen. Sport, doel, lichaamsdeel en spieren worden via de kennisgraaf afgeleid.</p></div><span class="training-intelligence-status" data-training-status>Niet geladen</span></div><div class="training-intelligence-grid"><div class="training-tag-box"><strong>Equipment type</strong><small>Wat voor trainingsapparaat of hulpmiddel is dit?</small><div class="training-tag-list" data-equipment-tags></div></div><div class="training-tag-box"><strong>Oefeningen</strong><small>Welke oefeningen kunnen hier direct mee worden uitgevoerd?</small><div class="training-tag-list" data-exercise-tags></div></div></div><div class="training-intelligence-summary" data-training-summary><strong>Automatische classificatie</strong>Selecteer equipment en oefeningen. De bovenliggende sport-, doel- en spierrelaties worden automatisch via de FitConnect knowledge graph gebruikt.</div>`;
    const actions=form.querySelector('.editor-actions,.form-actions,[data-product-actions]');if(actions)actions.before(panel);else form.appendChild(panel);
    panel.addEventListener('change',()=>capture(panel));return panel;
  }

  function renderReference(panel,selected={equipment:[],exercises:[]}){
    const selectedEquipment=new Set((selected.equipment||[]).map(item=>item.id));
    const selectedExercises=new Set((selected.exercises||[]).map(item=>item.id));
    const groups=new Map();state.equipment.forEach(item=>{if(!groups.has(item.equipment_group))groups.set(item.equipment_group,[]);groups.get(item.equipment_group).push(item)});
    panel.querySelector('[data-equipment-tags]').innerHTML=[...groups.entries()].map(([group,items])=>`<div style="width:100%;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:4px 0 0">${esc(group)}</div>${items.map(item=>`<label class="training-tag"><input type="checkbox" value="${esc(item.id)}" data-equipment-id${selectedEquipment.has(item.id)?' checked':''}><span>${esc(item.name)}</span></label>`).join('')}`).join('');
    panel.querySelector('[data-exercise-tags]').innerHTML=state.exercises.map(item=>`<label class="training-tag"><input type="checkbox" value="${esc(item.id)}" data-exercise-id${selectedExercises.has(item.id)?' checked':''}><span>${esc(item.name)}</span></label>`).join('');
    capture(panel,false);
  }

  function capture(panel,mark=true){
    state.pending={equipment:[...panel.querySelectorAll('[data-equipment-id]:checked')].map(node=>node.value),exercises:[...panel.querySelectorAll('[data-exercise-id]:checked')].map(node=>node.value)};
    const equipmentNames=[...panel.querySelectorAll('[data-equipment-id]:checked')].map(node=>node.closest('label')?.innerText.trim()).filter(Boolean);
    const exerciseNames=[...panel.querySelectorAll('[data-exercise-id]:checked')].map(node=>node.closest('label')?.innerText.trim()).filter(Boolean);
    panel.querySelector('[data-training-summary]').innerHTML=`<strong>${equipmentNames.length} equipmenttype${equipmentNames.length===1?'':'s'} · ${exerciseNames.length} oefening${exerciseNames.length===1?'':'en'}</strong>${equipmentNames.length?`Equipment: ${esc(equipmentNames.join(', '))}`:'Nog geen equipment geselecteerd.'}${exerciseNames.length?`<br>Oefeningen: ${esc(exerciseNames.join(', '))}`:''}`;
    if(mark)panel.querySelector('[data-training-status]').textContent='Wijzigingen klaar voor opslaan';
  }

  async function loadProduct(id,form){
    state.productId=id;state.pending=null;const panel=ensurePanel(form);panel.querySelector('[data-training-status]').textContent='Trainingdata laden…';
    try{
      await loadReference();const db=client();const {data,error}=await db.rpc('training_product_taxonomy',{p_product_id:id});if(error)throw error;
      if(state.productId!==id)return;renderReference(panel,data||{});panel.querySelector('[data-training-status]').textContent='Trainingdata gekoppeld';
    }catch(error){console.error('[Training Intelligence]',error);panel.querySelector('[data-training-status]').textContent='Trainingdata kon niet laden'}
  }

  async function prepareNewProduct(form){
    if(!form)return;state.productId=null;state.pending=null;const panel=ensurePanel(form);panel.querySelector('[data-training-status]').textContent='Trainingdata voorbereiden…';
    try{await loadReference();renderReference(panel,{equipment:[],exercises:[]});panel.querySelector('[data-training-status]').textContent='Kies trainingdata voor dit product'}
    catch(error){console.error('[Training Intelligence]',error);panel.querySelector('[data-training-status]').textContent='Trainingdata kon niet laden'}
  }

  async function persist(id){
    if(!id||state.productId!==id||!state.pending)return;
    const panel=document.querySelector('#productForm [data-training-intelligence]');const status=panel?.querySelector('[data-training-status]');if(status)status.textContent='Trainingdata opslaan…';
    try{
      const db=client();const {error}=await db.rpc('training_admin_set_product_taxonomy',{p_product_id:id,p_equipment_ids:state.pending.equipment,p_exercise_ids:state.pending.exercises});if(error)throw error;
      if(status)status.textContent='Trainingdata opgeslagen';window.fitConnectToast?.('Training Intelligence bijgewerkt');
    }catch(error){console.error('[Training Intelligence]',error);if(status)status.textContent='Trainingdata opslaan mislukt';window.fitConnectToast?.(error.message||'Trainingdata opslaan mislukt')}
  }

  window.addEventListener('fitconnect:product-editor-opened',event=>{const {id,form}=event.detail||{};if(id&&form)loadProduct(id,form)});
  window.addEventListener('fitconnect:product-saved',event=>{const id=event.detail?.id;if(id&&!state.productId)state.productId=id;persist(id)});
  document.getElementById('newProduct')?.addEventListener('click',()=>window.setTimeout(()=>prepareNewProduct(document.getElementById('productForm')),0));

  const api=Object.freeze({loadProduct,prepareNewProduct,persist,getState:()=>({...state,pending:state.pending?{...state.pending}:null})});
  window.FitConnectTrainingProductIntelligence=api;
  window.FitConnectTrainingProductIntelligenceRenderer=api;
})();
