import { createClient } from "npm:@supabase/supabase-js@2";
const text=(body:string,status=200)=>new Response(body,{status,headers:{"content-type":"text/plain; charset=utf-8"}});
Deno.serve(async req=>{if(req.method!=='POST')return text('Method not allowed',405);try{
 const raw=await req.text();const params=new URLSearchParams(raw);let id=params.get('id')||'';if(!id&&raw.trim().startsWith('{')){try{id=String(JSON.parse(raw).id||'')}catch{}}if(!/^tr_[A-Za-z0-9]+$/.test(id))return text('Bad request',400);
 const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,mollie=Deno.env.get('MOLLIE_API_KEY')!;const sb=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const mr=await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${mollie}`}});if(!mr.ok)return text('Provider verification failed',502);const payment=await mr.json();const purchaseId=String(payment?.metadata?.purchaseId||'');if(!purchaseId)return text('Missing purchase',400);
 const {data:p,error}=await sb.from('customer_credit_purchases').select('id,organization_id,customer_user_id,amount_paid,credit_amount,currency,provider_payment_id,status,credited_at').eq('id',purchaseId).single();if(error||!p)return text('Purchase not found',404);if(p.provider_payment_id!==id)return text('Payment mismatch',409);
 const providerAmount=Number(payment?.amount?.value);if(payment?.amount?.currency!==p.currency||Math.abs(providerAmount-Number(p.amount_paid))>0.0001)return text('Amount mismatch',409);
 const map:Record<string,string>={open:'pending',pending:'pending',authorized:'pending',paid:'paid',failed:'failed',canceled:'cancelled',expired:'expired'};const status=map[String(payment.status)]||'pending';await sb.from('customer_credit_purchases').update({status,paid_at:status==='paid'?(payment.paidAt||new Date().toISOString()):null,updated_at:new Date().toISOString()}).eq('id',p.id);
 if(status==='paid'&&!p.credited_at){const {error:fe}=await sb.rpc('customer_credit_finalize_purchase',{p_purchase_id:p.id,p_provider_payment_id:id});if(fe)throw fe}
 return text('ok');
 }catch(e){console.error(e);return text('Webhook error',500)}});
