(()=>{
  'use strict';

  function deepFreeze(value,seen=new WeakSet()){
    if(value===null||typeof value!=='object'||seen.has(value))return value;
    seen.add(value);
    if(Array.isArray(value))value.forEach(item=>deepFreeze(item,seen));
    else Reflect.ownKeys(value).forEach(key=>deepFreeze(value[key],seen));
    return Object.freeze(value);
  }

  window.FitConnectDeepFreeze=deepFreeze;
})();
