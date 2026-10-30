/* VehiTrack · aviso de cookies + Google Consent Mode v2.
   Se carga ANTES del snippet de GTM: deja todo "denegado" por defecto y solo
   concede analítica si el usuario pulsa "Aceptar". Sin scripts en línea (CSP). */
(function(){
  var KEY='vt_consent', VIGENCIA_MS=365*24*3600*1000;
  window.dataLayer=window.dataLayer||[];
  function gtag(){ window.dataLayer.push(arguments); }
  var DENEGADO={ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted'};
  function leer(){
    try{ var v=JSON.parse(localStorage.getItem(KEY)||'null');
      if(v && (v.d==='granted'||v.d==='denied') && Date.now()-v.t<VIGENCIA_MS) return v.d; }catch(e){}
    return null;
  }
  function guardar(d){ try{ localStorage.setItem(KEY,JSON.stringify({d:d,t:Date.now()})); }catch(e){} }
  function aplicar(d){
    gtag('consent','update',{analytics_storage:d,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  }
  gtag('consent','default',Object.assign({wait_for_update:500},DENEGADO));
  var previo=leer(); if(previo==='granted') aplicar('granted');

  function cerrar(){ var b=document.getElementById('vtCookies'); if(b) b.remove(); }
  function elegir(d){ guardar(d); aplicar(d); window.dataLayer.push({event:'vt_consent_'+(d==='granted'?'aceptado':'rechazado')}); cerrar(); }
  function mostrar(){
    if(document.getElementById('vtCookies')) return;
    var b=document.createElement('div'); b.id='vtCookies'; b.setAttribute('role','dialog'); b.setAttribute('aria-label','Aviso de cookies');
    var p=document.createElement('p');
    p.appendChild(document.createTextNode('Usamos cookies de analítica (Google) para medir y mejorar el sitio. Solo se activan si las aceptas; puedes cambiar tu decisión cuando quieras. '));
    var a=document.createElement('a'); a.href='privacidad.html#cookies'; a.textContent='Más información'; p.appendChild(a);
    var w=document.createElement('div'); w.className='vtc-b';
    var r=document.createElement('button'); r.type='button'; r.textContent='Rechazar'; r.addEventListener('click',function(){elegir('denied');});
    var ok=document.createElement('button'); ok.type='button'; ok.textContent='Aceptar'; ok.addEventListener('click',function(){elegir('granted');});
    w.appendChild(r); w.appendChild(ok); b.appendChild(p); b.appendChild(w); document.body.appendChild(b);
  }
  function iniciar(){
    if(!document.getElementById('vtc-css')){ var l=document.createElement('link'); l.id='vtc-css'; l.rel='stylesheet'; l.href='consent.css'; document.head.appendChild(l); }
    if(previo===null) mostrar();
    document.addEventListener('click',function(e){ var el=e.target.closest&&e.target.closest('[data-cookies]'); if(el){ e.preventDefault(); mostrar(); } });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
})();
