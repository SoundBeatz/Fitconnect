(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const commands=[
 {label:'Executive Intelligence',hint:'Dashboard',target:'dashboard',keywords:'home overview intelligence'},
 {label:'Bestellingen',hint:'Commerce',target:'orders',keywords:'orders verkoop commerce'},
 {label:'Offertes',hint:'Commerce',target:'quotes',keywords:'quotes aanvragen offerte'},
 {label:'Facturen',hint:'Commerce',target:'invoices',keywords:'billing finance facturatie'},
 {label:'Klanten',hint:'Relaties',target:'customers',keywords:'customer customer360 dossier'},
 {label:'Producten',hint:'Catalogus',target:'products',keywords:'catalogus artikelen inventory'},
 {label:'Combinatiedeals',hint:'Commerce',target:'combination-deals',keywords:'bundles deals'},
 {label:'Merken',hint:'Catalogus',target:'brands',keywords:'brands'},
 {label:'Leveranciers',hint:'Operations',target:'suppliers',keywords:'suppliers inkoop'},
 {label:'Trainingen',hint:'Platform',target:'training',keywords:'training coaching'},
 {label:'Garantie',hint:'Operations',target:'warranty',keywords:'warranty garantie'},
 {label:'Service',hint:'Operations',target:'service',keywords:'service onderhoud'}
];
function style(){if(document.querySelector('link[data-commerce-control-plane]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='commerce-control-plane.css?v=20260815-1';link.dataset.commerceControlPlane='1';document.head.appendChild(link)}
function existingNav(target){if(target==='quotes')return $('#quoteNavButton');return document.querySelector(`[data-view="${target}"]`)}
function go(target){const node=existingNav(target);if(node){node.click();closePalette();setTimeout(syncCommerceTabs,0);return true}return false}
function commerceNav(){return `<nav class="fc-commerce-nav" aria-label="Commerce workspace"><span class="fc-commerce-label">Commerce</span><button type="button" data-commerce-target="orders">Bestellingen</button><button type="button" data-commerce-target="quotes">Offertes</button><button type="button" data-commerce-target="invoices">Facturen</button><span class="fc-commerce-flow">Aanvraag → akkoord → betaling → levering</span></nav>`}
function installCommerceNav(section){if(!section||section.querySelector('.fc-commerce-nav'))return;const head=section.querySelector('.page-head');if(!head)return;head.insertAdjacentHTML('afterend',commerceNav());section.querySelectorAll('[data-commerce-target]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.commerceTarget)));syncCommerceTabs()}
function syncCommerceTabs(){const active=$('.view.active')?.id;$$('.fc-commerce-nav button').forEach(b=>b.classList.toggle('active',b.dataset.commerceTarget===active))}
function ensureCommerce(){installCommerceNav($('#orders'));installCommerceNav($('#quotes'));installCommerceNav($('#invoices'))}
function paletteMarkup(){return `<div class="fc-command-backdrop" id="fcCommandBackdrop" hidden></div><section class="fc-command" id="fcCommand" hidden aria-modal="true" role="dialog" aria-label="Command Center zoeken"><div class="fc-command-input"><span>⌕</span><input id="fcCommandSearch" type="search" autocomplete="off" placeholder="Zoek of ga naar…"><kbd>ESC</kbd></div><div class="fc-command-results" id="fcCommandResults"></div><footer><span>↑↓ navigeren</span><span>↵ openen</span><span>FitConnect Command Center</span></footer></section>`}
let selected=0,filtered=[...commands];
function renderCommands(){const host=$('#fcCommandResults');if(!host)return;host.innerHTML=filtered.map((c,i)=>`<button type="button" class="${i===selected?'selected':''}" data-command-index="${i}"><span><strong>${c.label}</strong><small>${c.hint}</small></span><kbd>↵</kbd></button>`).join('')||'<p class="fc-command-empty">Geen opdracht gevonden.</p>';host.querySelectorAll('[data-command-index]').forEach(b=>b.addEventListener('click',()=>{const c=filtered[Number(b.dataset.commandIndex)];if(c)go(c.target)}))}
function filterCommands(value=''){const q=value.trim().toLowerCase();filtered=commands.filter(c=>!q||`${c.label} ${c.hint} ${c.keywords}`.toLowerCase().includes(q));selected=0;renderCommands()}
function openPalette(){const modal=$('#fcCommand'),backdrop=$('#fcCommandBackdrop');if(!modal)return;modal.hidden=false;backdrop.hidden=false;document.body.classList.add('fc-command-open');filterCommands('');const input=$('#fcCommandSearch');input.value='';setTimeout(()=>input.focus(),0)}
function closePalette(){const modal=$('#fcCommand'),backdrop=$('#fcCommandBackdrop');if(!modal)return;modal.hidden=true;backdrop.hidden=true;document.body.classList.remove('fc-command-open')}
function installPalette(){if($('#fcCommand'))return;document.body.insertAdjacentHTML('beforeend',paletteMarkup());$('#fcCommandBackdrop').addEventListener('click',closePalette);$('#fcCommandSearch').addEventListener('input',e=>filterCommands(e.target.value));$('#fcCommandSearch').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();selected=Math.min(selected+1,Math.max(filtered.length-1,0));renderCommands()}if(e.key==='ArrowUp'){e.preventDefault();selected=Math.max(selected-1,0);renderCommands()}if(e.key==='Enter'&&filtered[selected]){e.preventDefault();go(filtered[selected].target)}});const actions=$('.topbar-actions');if(actions&&!$('#fcCommandButton')){const b=document.createElement('button');b.id='fcCommandButton';b.className='fc-command-button';b.type='button';b.innerHTML='<span>Zoeken</span><kbd>⌘K</kbd>';actions.prepend(b);b.addEventListener('click',openPalette)}document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#fcCommand')?.hidden?openPalette():closePalette()}else if(e.key==='Escape'&&!$('#fcCommand')?.hidden)closePalette()})}
function observe(){const main=$('.shell main');if(main)new MutationObserver(()=>{ensureCommerce();syncCommerceTabs()}).observe(main,{subtree:true,attributes:true,attributeFilter:['class'],childList:true})}
function init(){style();installPalette();ensureCommerce();observe();let tries=0;const timer=setInterval(()=>{ensureCommerce();if($('#quotes')||++tries>30)clearInterval(timer)},200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();