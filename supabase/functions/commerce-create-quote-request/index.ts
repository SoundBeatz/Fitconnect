import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { cleanText, normalizeEmail, normalizePhone, validEmail, validKvkNumber, validVatNumber } from "../_shared/validation.ts";
import { clientIp, consumeRateLimit } from "../_shared/payment-security.ts";

type QuoteItem = { productId?: string; quantity?: number };
type QuoteBody = {
  items?: QuoteItem[];
  customer?: {
    firstName?: string; lastName?: string; email?: string; phone?: string;
    company?: string; chamberOfCommerce?: string; vatNumber?: string;
    street?: string; houseNumber?: string; postalCode?: string; city?: string; country?: string;
  };
  note?: string;
};

const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const money=(value:number)=>Math.round((Number(value)+Number.EPSILON)*100)/100;

Deno.serve(async(request)=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  let phase="VALIDATION";
  try{
    const body=await request.json() as QuoteBody;
    const rawItems=Array.isArray(body.items)?body.items:[];
    if(!rawItems.length||rawItems.length>100)return json({error:"Selecteer minimaal één en maximaal 100 artikelen."},400);

    const customer=body.customer??{};
    const email=normalizeEmail(customer.email);
    const country=cleanText(customer.country,2).toUpperCase()||"NL";
    const phone=normalizePhone(customer.phone,country);
    const firstName=cleanText(customer.firstName,80);
    const lastName=cleanText(customer.lastName,80);
    if(!firstName||!lastName||!validEmail(email)||!phone)return json({error:"Vul geldige contactgegevens in."},400);
    const company=cleanText(customer.company,160)||null;
    const kvk=cleanText(customer.chamberOfCommerce,20).replace(/\D/g,"")||null;
    const vat=cleanText(customer.vatNumber,24).replace(/[\s.-]/g,"").toUpperCase()||null;
    if(kvk&&!validKvkNumber(kvk))return json({error:"Het KVK-nummer is ongeldig."},400);
    if(vat&&!validVatNumber(vat))return json({error:"Het btw-nummer is ongeldig."},400);

    const quantities=new Map<string,number>();
    for(const item of rawItems){
      const productId=cleanText(item.productId,64);
      const quantity=Number(item.quantity);
      if(!uuidPattern.test(productId)||!Number.isInteger(quantity)||quantity<1||quantity>999)return json({error:"De offerteaanvraag bevat een ongeldig artikel of aantal."},400);
      quantities.set(productId,(quantities.get(productId)??0)+quantity);
      if((quantities.get(productId)??0)>999)return json({error:"Het aangevraagde aantal is te groot."},400);
    }

    const supabase=adminClient();
    const organizationId=requiredEnv("FITCONNECT_ORGANIZATION_ID");
    const ip=clientIp(request);
    const [ipLimit,emailLimit]=await Promise.all([
      consumeRateLimit(supabase,"quote_request_ip",ip,20,3600),
      consumeRateLimit(supabase,"quote_request_email",email,8,3600),
    ]);
    if(!ipLimit.allowed||!emailLimit.allowed){const retry=Math.max(ipLimit.retryAfterSeconds,emailLimit.retryAfterSeconds,1);return json({error:"Te veel offerteaanvragen. Probeer het later opnieuw."},429,{"retry-after":String(retry)});}

    let portalUserId:string|null=null;
    const authorization=request.headers.get("Authorization")??"";
    const accessToken=authorization.startsWith("Bearer ")?authorization.slice(7):"";
    if(accessToken){const{data}=await supabase.auth.getUser(accessToken);portalUserId=data.user?.id??null;}

    phase="PRODUCTS";
    const ids=[...quantities.keys()];
    const{data:products,error:productError}=await supabase.from("products").select("id,name,sku,price,vat,status").in("id",ids).eq("status","active");
    if(productError)throw productError;
    if(!products||products.length!==ids.length)return json({error:"Een product is niet meer beschikbaar. Vernieuw de pagina."},409);

    const lines=products.map((product:any)=>{
      const quantity=quantities.get(product.id)!;
      const grossUnit=money(Number(product.price));
      const taxRate=Number(product.vat??21);
      const netUnit=Math.round((grossUnit/(1+taxRate/100))*10000)/10000;
      return {product_id:product.id,sku:product.sku??null,description:product.name,quantity,unit_price:netUnit,tax_rate:taxRate,list_gross_unit:grossUnit,source:"storefront_request"};
    });
    const subtotal=money(lines.reduce((sum,line)=>sum+Number(line.unit_price)*Number(line.quantity),0));
    const taxTotal=money(lines.reduce((sum,line)=>sum+Number(line.unit_price)*Number(line.quantity)*Number(line.tax_rate)/100,0));
    const grandTotal=money(subtotal+taxTotal);

    const customerSnapshot={
      first_name:firstName,last_name:lastName,email,phone,company:company??"",kvk_number:kvk??"",vat_number:vat??"",
      street:cleanText(customer.street,160),house_number:cleanText(customer.houseNumber,20),postal_code:cleanText(customer.postalCode,16),city:cleanText(customer.city,100),country,
    };

    phase="QUOTE";
    const{data:quote,error:quoteError}=await supabase.from("commerce_quotes").insert({
      organization_id:organizationId,portal_user_id:portalUserId,status:"requested",source_channel:"webshop",currency:"EUR",
      subtotal,tax_total:taxTotal,grand_total:grandTotal,customer_snapshot:customerSnapshot,line_snapshot:lines,
      customer_note:cleanText(body.note,2000)||null,created_by:portalUserId,updated_by:portalUserId,
    }).select("id,status,created_at").single();
    if(quoteError)throw quoteError;

    const itemSummary=lines.length===1?`${lines[0].quantity} × ${lines[0].description}`:`${lines.length} verschillende artikelen`;
    const{error:notificationError}=await supabase.from("commerce_notifications").insert({
      organization_id:organizationId,type:"quote_requested",entity_type:"quote",entity_id:quote.id,
      title:"Nieuwe offerteaanvraag",message:`${firstName} ${lastName} vraagt een offerte aan voor ${itemSummary}.`,priority:grandTotal>=5000?"high":"normal",status:"unread",
    });
    if(notificationError)console.error("quote notification insert failed",notificationError.message);

    return json({quoteId:quote.id,status:"requested",message:"Uw offerteaanvraag is ontvangen en staat in behandeling."},201);
  }catch(error){console.error("commerce-create-quote-request",{phase,message:error instanceof Error?error.message:"unknown"});return json({error:`De offerteaanvraag kon niet worden verstuurd (stap ${phase}).`},500);}
});
