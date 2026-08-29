(()=>{
  'use strict';

  const client=window.getFitConnectSupabase?.();
  const config=window.FITCONNECT_SUPABASE;
  if(!client||!config?.url||!config?.anonKey||!client.functions?.invoke)return;

  const originalInvoke=client.functions.invoke.bind(client.functions);

  client.functions.invoke=async function fitConnectInvoke(functionName,options={}){
    if(functionName!=='my-twin-image-ingest')return originalInvoke(functionName,options);

    try{
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError||!session?.access_token){
        return {data:null,error:new Error('Uw sessie is verlopen. Log opnieuw in en probeer het opnieuw.')};
      }

      const response=await fetch(`${config.url}/functions/v1/my-twin-image-ingest`,{
        method:'POST',
        headers:{
          authorization:`Bearer ${session.access_token}`,
          apikey:config.anonKey
        },
        body:options.body
      });

      const responseForError=response.clone();
      let data=null;
      try{data=await response.json()}catch{}

      if(!response.ok){
        const error=new Error(data?.error||`Veilige beeldverwerking antwoordde met HTTP ${response.status}.`);
        error.context=responseForError;
        return {data:null,error};
      }

      return {data,error:null};
    }catch(cause){
      const error=new Error('De beveiligde uploadverbinding kon niet worden bereikt. Controleer de verbinding en probeer opnieuw.');
      error.cause=cause;
      return {data:null,error};
    }
  };
})();
