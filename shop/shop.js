const products=[
{id:'rack',name:'Wandrack opklapbaar',category:'Kracht',description:'Ruimtebesparend rack voor squats, presses en pull-ups.',price:'Prijs op aanvraag'},
{id:'bench',name:'Verstelbare trainingsbank',category:'Kracht',description:'Stabiele bank voor vlakke, incline en shoulder oefeningen.',price:'Prijs op aanvraag'},
{id:'dumbbells',name:'Verstelbare dumbbellset',category:'Gewichten',description:'Compacte set voor progressive overload zonder volledig dumbbellrek.',price:'Prijs op aanvraag'},
{id:'plates',name:'Olympische halterschijven',category:'Gewichten',description:'Duurzame schijven voor homegym, studio en intensief gebruik.',price:'Prijs op aanvraag'},
{id:'treadmill',name:'Premium loopband',category:'Cardio',description:'Comfortabele loopband geselecteerd op gebruiker, ruimte en loopstijl.',price:'Prijs op aanvraag'},
{id:'rower',name:'Air rower',category:'Cardio',description:'Volledige conditietraining met kleine vloeroppervlakte.',price:'Prijs op aanvraag'},
{id:'floor',name:'Rubber sportvloer',category:'Vloer',description:'Bescherming, demping en een professionele afwerking op maat.',price:'Prijs op aanvraag'},
{id:'storage',name:'Wandopslag op maat',category:'Opslag',description:'Overzichtelijke opslag voor stangen, schijven, matten en accessoires.',price:'Prijs op aanvraag'},
{id:'bag',name:'Bokszak met veilige ophanging',category:'Boksen',description:'Complete oplossing met advies over plafond, wand en vrije bewegingszone.',price:'Prijs op aanvraag'}
];

const grid=document.getElementById('productGrid');
const searchInput=document.getElementById('searchInput');
const categoryFilter=document.getElementById('categoryFilter');
const cartPanel=document.getElementById('cartPanel');
const backdrop=document.getElementById('backdrop');
const cartItems=document.getElementById('cartItems');
const cartCount=document.getElementById('cartCount');
let cart=JSON.parse(localStorage.getItem('fitconnect-cart')||'[]');

function renderProducts(){
 const q=searchInput.value.trim().toLowerCase();
 const category=categoryFilter.value;
 const visible=products.filter(p=>(category==='Alle'||p.category===category)&&(`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q)));
 grid.innerHTML=visible.length?visible.map(p=>`<article class="product-card"><div class="product-visual"><span>${p.category.toUpperCase()}</span></div><div class="product-copy"><h3>${p.name}</h3><p>${p.description}</p><div class="product-meta"><strong>${p.price}</strong><button class="add-button" data-id="${p.id}" type="button">Toevoegen</button></div></div></article>`).join(''):'<div class="empty-state">Geen producten gevonden. Probeer een andere zoekterm of categorie.</div>';
 document.querySelectorAll('.add-button').forEach(button=>button.addEventListener('click',()=>addToCart(button.dataset.id)));
}

function addToCart(id){if(!cart.includes(id))cart.push(id);saveCart();openCart()}
function removeFromCart(id){cart=cart.filter(item=>item!==id);saveCart()}
function saveCart(){localStorage.setItem('fitconnect-cart',JSON.stringify(cart));renderCart()}
function renderCart(){
 cartCount.textContent=cart.length;
 cartItems.innerHTML=cart.length?cart.map(id=>{const p=products.find(item=>item.id===id);return `<div class="cart-item"><div><h4>${p.name}</h4><span>${p.category} · ${p.price}</span></div><button class="remove-button" data-remove="${p.id}" type="button">Verwijder</button></div>`}).join(''):'<div class="empty-state">Uw winkelmand is nog leeg.</div>';
 document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>removeFromCart(button.dataset.remove)));
}
function openCart(){cartPanel.classList.add('open');backdrop.classList.add('open');cartPanel.setAttribute('aria-hidden','false')}
function closeCart(){cartPanel.classList.remove('open');backdrop.classList.remove('open');cartPanel.setAttribute('aria-hidden','true')}

document.getElementById('cartButton').addEventListener('click',openCart);
document.getElementById('closeCart').addEventListener('click',closeCart);
backdrop.addEventListener('click',closeCart);
searchInput.addEventListener('input',renderProducts);
categoryFilter.addEventListener('change',renderProducts);
document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{categoryFilter.value=button.dataset.category;renderProducts();document.getElementById('producten').scrollIntoView()}));
document.getElementById('checkoutButton').addEventListener('click',()=>{
 if(!cart.length)return;
 const list=cart.map(id=>products.find(p=>p.id===id).name).join('\n- ');
 const body=encodeURIComponent(`Hallo FitConnect,\n\nIk ontvang graag prijs en advies voor:\n- ${list}\n\nNaam:\nTelefoon:\nPostcode:\nAanvullende wensen:`);
 window.location.href=`mailto:info@fitconnect.nl?subject=Aanvraag%20FitConnect%20Shop&body=${body}`;
});
document.getElementById('year').textContent=new Date().getFullYear();
renderProducts();renderCart();