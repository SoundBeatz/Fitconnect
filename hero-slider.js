(()=>{
  'use strict';
  const slider=document.getElementById('heroSlider');
  if(!slider)return;
  const slides=[...slider.querySelectorAll('.hero-slide')];
  const tabs=[...slider.querySelectorAll('[data-slide-to]')];
  const counter=document.getElementById('sliderCounter');
  let current=0,timer=null,manual=false,touchStartX=null;

  function show(index,{user=false}={}){
    if(user)stopAutoplay();
    current=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>{
      const active=i===current;
      slide.classList.toggle('is-active',active);
      slide.setAttribute('aria-hidden',String(!active));
    });
    tabs.forEach((tab,i)=>{
      const active=i===current;
      tab.classList.toggle('is-active',active);
      tab.setAttribute('aria-selected',String(active));
    });
    counter.textContent=`${String(current+1).padStart(2,'0')} — ${String(slides.length).padStart(2,'0')}`;
  }
  function startAutoplay(){
    if(manual||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    clearInterval(timer);timer=setInterval(()=>show(current+1),6000);
  }
  function stopAutoplay(){manual=true;clearInterval(timer);timer=null;slider.classList.add('is-manual')}
  slider.querySelector('.slider-prev').addEventListener('click',()=>show(current-1,{user:true}));
  slider.querySelector('.slider-next').addEventListener('click',()=>show(current+1,{user:true}));
  tabs.forEach(tab=>tab.addEventListener('click',()=>show(Number(tab.dataset.slideTo),{user:true})));
  slider.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();show(current-1,{user:true})}if(event.key==='ArrowRight'){event.preventDefault();show(current+1,{user:true})}});
  slider.addEventListener('touchstart',event=>{touchStartX=event.changedTouches[0].clientX},{passive:true});
  slider.addEventListener('touchend',event=>{if(touchStartX===null)return;const distance=event.changedTouches[0].clientX-touchStartX;touchStartX=null;if(Math.abs(distance)>45)show(current+(distance<0?1:-1),{user:true})},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInterval(timer);else startAutoplay()});
  show(0);startAutoplay();
})();
