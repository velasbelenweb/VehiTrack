/* VehiTrack · aviso de cookies + Google Consent Mode v2 (analítica y publicidad por separado).
   Se carga ANTES del snippet de GTM: todo "denegado" por defecto; solo se concede lo que el usuario acepta.
   Sin scripts en línea (CSP). */
(function(){
  var KEY='vt_consent', VIGENCIA_MS=365*24*3600*1000;
  window.dataLayer=window.dataLayer||[];
  function gtag(){ window.dataLayer.push(arguments); }
  function leer(){
    try{ var v=JSON.parse(localStorage.getItem(KEY)||'null');
      if(v && Date.now()-v.t<VIGENCIA_MS){
        if(v.a||v.p) return {a:v.a==='granted'?'granted':'denied', p:v.p==='granted'?'granted':'denied'};
        if(v.d==='granted'||v.d==='denied') return {a:v.d, p:'denied'}; // formato anterior: solo analítica
      } }catch(e){}
    return null;
  }
  function guardar(c){ try{ localStorage.setItem(KEY,JSON.stringify({a:c.a,p:c.p,t:Date.now()})); }catch(e){} }
  function aplicar(c){
    gtag('consent','update',{analytics_storage:c.a,ad_storage:c.p,ad_user_data:c.p,ad_personalization:c.p});
  }
  gtag('consent','default',{wait_for_update:500,analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted'});
  var previo=leer(); if(previo) aplicar(previo);

  function cerrar(){ var b=document.getElementById('vtCookies'); if(b) b.remove(); }
  function elegir(c){
    guardar(c); aplicar(c);
    window.dataLayer.push({event:'vt_consent_actualizado',vt_analitica:c.a,vt_publicidad:c.p});
    cerrar();
  }
  function el(tag,props,kids){ var e=document.createElement(tag); for(var k in props) e[k]=props[k]; (kids||[]).forEach(function(c){ e.appendChild(typeof c==='string'?document.createTextNode(c):c); }); return e; }
  function btn(txt,cls,fn){ var b=el('button',{type:'button',textContent:txt,className:cls||''}); b.addEventListener('click',fn); return b; }
  function opcion(id,titulo,desc,marcado){
    var cb=el('input',{type:'checkbox',id:id,checked:!!marcado});
    return el('label',{className:'vtc-op',htmlFor:id},[cb,el('span',{},[el('b',{textContent:titulo}),document.createElement('br'),desc])]);
  }
  function mostrar(){
    if(document.getElementById('vtCookies')) return;
    var cur=leer()||{a:'denied',p:'denied'};
    var b=el('div',{id:'vtCookies'}); b.setAttribute('role','dialog'); b.setAttribute('aria-label','Aviso de cookies');
    var a=el('a',{href:'privacidad.html#cookies',textContent:'Más información'});
    var p=el('p',{},['Usamos cookies de analítica (Google) para medir el sitio y, si lo aceptas, de publicidad (Meta) para medir y mejorar nuestras campañas. Nada de esto se activa sin tu permiso y puedes cambiarlo cuando quieras. ',a]);
    var pers=el('div',{className:'vtc-pers',hidden:true},[
      opcion('vtcA','Analítica','Estadísticas de uso del sitio (Google Analytics).',cur.a==='granted'),
      opcion('vtcP','Publicidad','Medición de campañas y anuncios (Meta).',cur.p==='granted'),
      btn('Guardar mi elección','',function(){ elegir({a:document.getElementById('vtcA').checked?'granted':'denied',p:document.getElementById('vtcP').checked?'granted':'denied'}); })
    ]);
    var w=el('div',{className:'vtc-b'},[
      btn('Rechazar todo','sec',function(){ elegir({a:'denied',p:'denied'}); }),
      btn('Personalizar','sec',function(){ pers.hidden=!pers.hidden; }),
      btn('Aceptar todo','',function(){ elegir({a:'granted',p:'granted'}); })
    ]);
    b.appendChild(p); b.appendChild(w); b.appendChild(pers); document.body.appendChild(b);
  }
  function iniciar(){
    if(!document.getElementById('vtc-css')){ var l=document.createElement('link'); l.id='vtc-css'; l.rel='stylesheet'; l.href='consent.css'; document.head.appendChild(l); }
    if(!previo) mostrar();
    document.addEventListener('click',function(e){ var x=e.target.closest&&e.target.closest('[data-cookies]'); if(x){ e.preventDefault(); mostrar(); } });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
})();
