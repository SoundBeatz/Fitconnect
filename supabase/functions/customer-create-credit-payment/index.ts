import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient, authenticatedClient } from "../_shared/supabase.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return json({error:'Authentication required'},401);

    const body=await req.json();
    const packageId=String(body.packageId||'');
    const idempotencyKey=String(body.idempotencyKey||'');
    if(!uuid.test(packageId)||!uuid.test(idempotencyKey))return json({error:'Ongeldige aanvraag'},400);

    const sb=adminClient();
    const {data:{user},error:uerr}=await sb.auth.getUser(token);
    if(uerr||!user)return json({error:'Authentication required'},401);

    const customer=authenticatedClient(token);
    const {data:visiblePackage,error:visibleError}=await customer.from('customer_credit_packages')
      .select('id,organization_id,name,price,credit_amount,currency,active')
      .eq('id',packageId).eq('active',true).single();
    if(visibleError||!visiblePackage)return json({error:'Creditpakket niet beschikbaar'},404);
    const org=visiblePackage.organization_id;

    const {data:existing,error:ee}=await sb.from('customer_credit_purchases')
      .select('id,status,checkout_url')
      .eq('organization_id',org).eq('customer_user_id',user.id).eq('idempotency_key',idempotencyKey).maybeSingle();
    if(ee)throw ee;
    if(existing?.checkout_url&&['created','pending'].includes(existing.status))return json({purchaseId:existing.id,checkoutUrl:existing.checkout_url,reused:true});

    const {data:purchase,error:ie}=await sb.from('customer_credit_purchases').insert({
      organization_id:org,
      customer_user_id:user.id,
      package_id:visiblePackage.id,
      amount_paid:visiblePackage.price,
      credit_amount:visiblePackage.credit_amount,
      currency:visiblePackage.currency,
      provider:'mollie',
      status:'created',
      idempotency_key:idempotencyKey
    }).select('id').single();
    if(ie)throw ie;

    const base=(Deno.env.get('CREDIT_RETURN_URL')||'https://fitconnect.nl/portal/account/').replace(/\/$/,'');
    const returnUrl=`${base}/?credit=return#wallet`;
    const webhookUrl=`${requiredEnv('SUPABASE_URL')}/functions/v1/customer-credit-mollie-webhook`;
    const mr=await fetch('https://api.mollie.com/v2/payments',{
      method:'POST',
      headers:{authorization:`Bearer ${requiredEnv('MOLLIE_API_KEY')}`,'content-type':'application/json','Idempotency-Key':`credit-${purchase.id}`},
      body:JSON.stringify({
        amount:{currency:String(visiblePackage.currency||'EUR').toUpperCase(),value:Number(visiblePackage.price).toFixed(2)},
        description:`${visiblePackage.name} · FitConnect tegoed`,
        redirectUrl:returnUrl,
        webhookUrl,
        metadata:{type:'credit_purchase',purchaseId:purchase.id,organizationId:org,customerUserId:user.id,packageId:visiblePackage.id}
      })
    });
    const payment=await mr.json();
    if(!mr.ok){
      await sb.from('customer_credit_purchases').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',purchase.id).eq('organization_id',org);
      return json({error:'Betaling kon niet worden aangemaakt'},502);
    }
    const checkoutUrl=payment?._links?.checkout?.href;
    if(!payment.id||!checkoutUrl)throw new Error('Invalid Mollie response');
    const {error:updateError}=await sb.from('customer_credit_purchases').update({provider_payment_id:payment.id,checkout_url:checkoutUrl,status:'pending',updated_at:new Date().toISOString()}).eq('id',purchase.id).eq('organization_id',org);
    if(updateError)throw updateError;
    return json({purchaseId:purchase.id,checkoutUrl});
  }catch(e){
    console.error('customer-create-credit-payment',e instanceof Error?e.message:'unknown');
    return json({error:'Creditbetaling kon niet worden gestart'},500);
  }
});
