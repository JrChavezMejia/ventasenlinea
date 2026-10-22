/* CH360 · Vincular a una hoja de Google Sheets. No contiene claves públicas. */
const PRODUCTS = [
 {id:'P01',name:'Pulse Runner',category:'Calzado',price:650,cost:390,initialStock:100},
 {id:'P02',name:'Street Essential',category:'Calzado',price:550,cost:330,initialStock:100},
 {id:'P03',name:'Court Elevate',category:'Calzado',price:750,cost:450,initialStock:100},
 {id:'P04',name:'Everyday Tee',category:'Ropa',price:180,cost:90,initialStock:150},
 {id:'P05',name:'Move Pack',category:'Accesorios',price:320,cost:176,initialStock:100}
];
const HEADERS = ['Fecha','Codigo','Nombre','Correo','Consentimiento correo','Detalle JSON','Total Q','Costo Q','Utilidad bruta Q','Estado correo'];
const TIKTOK = 'https://www.tiktok.com/@dr.jose.chavez';

// Ejecutar una vez desde el editor. No borra información ni envía mensajes.
function configurar() {
 const ss=SpreadsheetApp.getActiveSpreadsheet();
 if(!ss) throw new Error('Abra Apps Script desde Extensiones en una hoja de cálculo.');
 const props=PropertiesService.getScriptProperties();
 props.setProperty('SPREADSHEET_ID',ss.getId());
 if(!props.getProperty('ENVIAR_CORREOS')) props.setProperty('ENVIAR_CORREOS','NO');
 if(!props.getProperty('ACEPTAR_COMPRAS')) props.setProperty('ACEPTAR_COMPRAS','SI');
 let sheet=ss.getSheetByName('Ventas');
 if(!sheet) sheet=ss.insertSheet('Ventas');
 if(sheet.getLastRow()===0){sheet.appendRow(HEADERS);sheet.setFrozenRows(1);sheet.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#111111').setFontColor('#ffffff');}
 verificarCabecera_(sheet);
 ss.setSpreadsheetTimeZone('America/Guatemala');
 // Solicita permiso de correo sin enviar ningún correo.
 console.log('Configuración lista. Cuota de destinatarios disponible: '+MailApp.getRemainingDailyQuota());
}
function verificarCabecera_(s){if(JSON.stringify(s.getRange(1,1,1,HEADERS.length).getValues()[0])!==JSON.stringify(HEADERS))throw new Error('La estructura de Ventas no coincide. Revise los encabezados sin borrar sus ventas.');}
function sheet_(){const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('Falta ejecutar configurar().');const s=SpreadsheetApp.openById(id).getSheetByName('Ventas');if(!s)throw new Error('No existe la hoja Ventas.');verificarCabecera_(s);return s;}
function rows_(s){return s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,HEADERS.length).getValues():[];}
function safeCell_(s){return /^[=+@\-]/.test(s)?"'"+s:s;}
function escape_(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function q_(n){return 'Q'+Number(n).toFixed(2);}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function validate_(raw){
 if(typeof raw!=='string'||raw.length>12000)throw new Error('Solicitud no válida.');
 let p;try{p=JSON.parse(raw)}catch(e){throw new Error('La solicitud no tiene un formato válido.');}
 if(!p||typeof p!=='object')throw new Error('Solicitud no válida.');
 if(!/^[a-f0-9-]{36}$/i.test(p.id||''))throw new Error('Código de operación no válido.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80||/[\r\n]/.test(p.name))throw new Error('Revise su nombre.');
 if(typeof p.email!=='string'||p.email.length>150||! /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(p.email))throw new Error('Revise su correo electrónico.');
 if(typeof p.consent!=='boolean')throw new Error('Consentimiento no válido.');
 if(!Array.isArray(p.items)||p.items.length<1||p.items.length>PRODUCTS.length)throw new Error('Seleccione entre uno y cinco productos.');
 const ids=new Set();
 const items=p.items.map(i=>{const product=i&&PRODUCTS.find(x=>x.id===i.id);if(!product||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>10||ids.has(i.id))throw new Error('Producto o cantidad no válidos.');ids.add(i.id);return {id:product.id,name:product.name,quantity:i.quantity,price:product.price,cost:product.cost};});
 return {id:p.id,name:p.name.trim(),email:p.email.trim(),consent:p.consent,items,total:items.reduce((s,i)=>s+i.quantity*i.price,0),cost:items.reduce((s,i)=>s+i.quantity*i.cost,0)};
}
function doPost(e){
 const lock=LockService.getScriptLock();
 let locked=false;
 try{
  const p=validate_(e&&e.parameter&&e.parameter.payload);
  if(!lock.tryLock(20000))throw new Error('Hay varias compras en proceso. Inténtelo nuevamente.');locked=true;
  const s=sheet_(),rows=rows_(s),old=rows.find(r=>r[1]===p.id);
  // El código identifica una única operación; no duplica ventas ni correos.
  if(old)return confirmation_('Operación ya registrada','Este código ya fue procesado. No se registró otra compra ni se volvió a enviar el correo.',null);
  if(PropertiesService.getScriptProperties().getProperty('ACEPTAR_COMPRAS')!=='SI')throw new Error('La recepción de compras está cerrada.');
  const used={};rows.forEach(r=>JSON.parse(r[5]).forEach(i=>used[i.id]=(used[i.id]||0)+i.quantity));
  p.items.forEach(i=>{const prod=PRODUCTS.find(x=>x.id===i.id);if((used[i.id]||0)+i.quantity>prod.initialStock)throw new Error('No hay existencias suficientes de '+prod.name+'. Ajuste su bolsa.');});
  // Evita múltiples correos al mismo destinatario durante una sesión.
  const alreadyMailed=rows.some(r=>String(r[3]).replace(/^'/,'').toLowerCase()===p.email.toLowerCase()&&r[9]==='ENVIADO');
  let status=p.consent?'PENDIENTE':'NO SOLICITADO';
  const now=new Date();
  s.appendRow([now,p.id,safeCell_(p.name),safeCell_(p.email),p.consent,JSON.stringify(p.items),p.total,p.cost,p.total-p.cost,status]);
  const row=s.getLastRow();SpreadsheetApp.flush();
  if(p.consent){
   if(alreadyMailed)status='OMITIDO: YA RECIBIO UN CORREO';
   else if(PropertiesService.getScriptProperties().getProperty('ENVIAR_CORREOS')!=='SI')status='DESACTIVADO';
   else {
    try{
     if(MailApp.getRemainingDailyQuota()<1)status='SIN CUOTA';
     else{MailApp.sendEmail({to:p.email,subject:'Gracias por participar — Compra simulada CH360',body:receiptText_(p,now),htmlBody:receiptHtml_(p,now),name:'Dr. José Chávez · Demostración'});status='ENVIADO';}
    }catch(err){console.error('No se pudo enviar el correo: '+err.message);status='ERROR DE ENVIO';}
   }
   s.getRange(row,10).setValue(status);
  }
  return confirmation_('Compra simulada registrada','Código: '+p.id+' · Estado del correo: '+status+'.',p);
 }catch(err){console.error(err);return confirmation_('No se completó la solicitud','Revise su bolsa e inténtelo nuevamente. '+(err.message||'Error de registro.'),null);}
 finally{if(locked)lock.releaseLock();}
}
function receiptText_(p,date){return 'Hola, '+p.name+':\n\nHola, soy el Dr. José Chávez y gracias por ver esta demostración.\n\nComprobante de compra simulada\nCódigo: '+p.id+'\nFecha: '+Utilities.formatDate(date,'America/Guatemala','dd/MM/yyyy HH:mm')+'\n\n'+p.items.map(i=>i.quantity+' × '+i.name+' — '+q_(i.quantity*i.price)).join('\n')+'\n\nTotal simulado: '+q_(p.total)+'\n\nNo se realizó ningún cobro. Sin validez fiscal. No se enviarán productos.\n\nLe agradeceré que me siga en TikTok: '+TIKTOK+'\n\nDr. José Rodolfo Chávez Mejía';}
function receiptHtml_(p,date){return '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:30px"><h1>CH360</h1><p>Hola, '+escape_(p.name)+':</p><p>Hola, soy el Dr. José Chávez y gracias por ver esta demostración.</p><h2>Tu compra simulada.</h2><p>Código: '+escape_(p.id)+'<br>'+Utilities.formatDate(date,'America/Guatemala','dd/MM/yyyy HH:mm')+'</p><table style="width:100%;border-collapse:collapse">'+p.items.map(i=>'<tr><td style="padding:12px 0;border-bottom:1px solid #ddd">'+i.quantity+' × '+escape_(i.name)+'</td><td style="text-align:right">'+q_(i.quantity*i.price)+'</td></tr>').join('')+'</table><h2>Total simulado: '+q_(p.total)+'</h2><p>No se realizó ningún cobro. Sin validez fiscal. No se enviarán productos.</p><p>Le agradeceré que me siga en TikTok.</p><a href="'+TIKTOK+'" style="display:inline-block;padding:15px 24px;background:#111;color:#fff;border-radius:25px;text-decoration:none">Seguir al Dr. José Chávez ↗</a><p>Dr. José Rodolfo Chávez Mejía</p></div>';}
function confirmation_(title,message,p){return HtmlService.createHtmlOutput('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;background:#f4f4f4;padding:30px"><main style="max-width:600px;background:white;padding:30px;margin:auto"><p>CH360 / EXPERIENCIA EDUCATIVA</p><h1>'+escape_(title)+'</h1><p>'+escape_(message)+'</p>'+(p?'<p>Total: <strong>'+q_(p.total)+'</strong></p><p>'+p.items.map(i=>escape_(i.quantity+' × '+i.name)).join('<br>')+'</p>':'')+'<p>No se realizó ningún cobro. Sin validez fiscal.</p><p>Puede cerrar esta pestaña y volver a la tienda.</p><a href="'+TIKTOK+'" target="_blank" rel="noopener">Seguir al Dr. José Chávez en TikTok ↗</a></main></body></html>').setTitle(title);}
// Resumen público: nunca incluye nombres, correos ni códigos de compradores.
function buildSummary_(rows,now){
 const products=PRODUCTS.map(p=>({id:p.id,producto:p.name,categoria:p.category,precio:p.price,costo_unitario_simulado:p.cost,unidades:0,ingresos:0,costo:0,existencias:p.initialStock}));
 rows.forEach(r=>JSON.parse(r[5]).forEach(i=>{const p=products.find(p=>p.id===i.id);if(!p)throw new Error('Producto histórico desconocido.');p.unidades+=i.quantity;p.ingresos+=i.quantity*i.price;p.costo+=i.quantity*i.cost;p.existencias-=i.quantity;}));
 const revenue=products.reduce((s,p)=>s+p.ingresos,0),cost=products.reduce((s,p)=>s+p.costo,0);
 const units=products.reduce((s,p)=>s+p.unidades,0),max=Math.max(...products.map(p=>p.unidades));
 return {tipo:'demostracion_educativa',actualizado:now.toISOString(),moneda:'GTQ',compras:rows.length,unidades:units,ingresos:revenue,costo_simulado:cost,utilidad_bruta_simulada:revenue-cost,ticket_promedio:rows.length?Number((revenue/rows.length).toFixed(2)):0,mas_vendidos:max?products.filter(p=>p.unidades===max).map(p=>p.producto):[],productos:products,advertencias:['Costos e inventarios iniciales simulados.','Utilidad bruta: no descuenta gastos operativos ni impuestos.','Ventas observadas en una demostración; no representan una investigación de mercado representativa.'],roles:{ventas:'Analizar compras, ingresos, unidades y productos más vendidos.',operaciones:'Revisar existencias y proponer reposición.',gerencia:'Integrar hallazgos y proponer alternativas para decisión humana.'}};
}
function doGet(e){try{const action=e&&e.parameter&&e.parameter.action||'resumen';if(action!=='resumen')return json_({ok:false,error:'Acción no disponible.'});return json_({ok:true,...buildSummary_(rows_(sheet_()),new Date())});}catch(err){console.error(err);return json_({ok:false,error:'Resumen no disponible. Revise la configuración y los registros desde el editor.'});}}
