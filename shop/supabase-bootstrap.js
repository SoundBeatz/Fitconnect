(()=>{
  'use strict';
  const PRIMARY='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const FALLBACK='https://unpkg.com/@supabase/supabase-js@2';
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.crossOrigin='anonymous';s.onload=()=>resolve();s.onerror=()=>reject(new Error(`Supabase CDN failed: ${src}`));document.head.appendChild(s);});}
  window.fitConnectSupabaseReady=(async()=>{
    if(window.supabase?.createClient)return true;
    try{await load(PRIMARY);}catch(_primary){try{await load(FALLBACK);}catch(_fallback){return false;}}
    return Boolean(window.supabase?.createClient);
  })();
})();
