'use strict';
const catalog = [
 {id:'P01',name:'Pulse Runner',category:'Calzado',description:'Running · Rojo energía',price:650,image:'photo-1542291026-7eec264c27ff',tag:'EL MOVIMIENTO EMPIEZA AQUÍ'},
 {id:'P02',name:'Street Essential',category:'Calzado',description:'Lifestyle · Blanco esencial',price:550,image:'photo-1549298916-b41d501d3772',tag:'TU DÍA. TU RITMO.'},
 {id:'P03',name:'Court Elevate',category:'Calzado',description:'Urbano · Edición deportiva',price:750,image:'photo-1600185365926-3a2ce3cdb9eb',tag:'UN PASO MÁS'},
 {id:'P04',name:'Everyday Tee',category:'Ropa',description:'Camiseta · Comodidad diaria',price:180,image:'photo-1521572163474-6864f9cf17ab',tag:'MENOS ES MÁS'},
 {id:'P05',name:'Move Pack',category:'Accesorios',description:'Mochila · Lleva lo esencial',price:320,image:'photo-1553062407-98eeb64c6a62',tag:'SIEMPRE CONTIGO'}
];
const cart = new Map(); let submitted = false; let orderId = crypto.randomUUID();
const $ = s => document.querySelector(s);
const money = n => 'Q'+n.toFixed(2);
function renderProducts(filter='Todos') {
 $('#products').innerHTML = catalog.filter(p=>filter==='Todos'||p.category===filter).map(p=>`<article><div class="product-photo"><img src="https://images.unsplash.com/${p.image}?auto=format&fit=crop&w=700&q=80" alt="${p.name}, fotografía ilustrativa" loading="lazy"><span class="product-tag">${p.tag}</span></div><div class="product-info"><div><h3>${p.name}</h3><p>${p.description}</p></div><span class="price">${money(p.price)}</span></div><button class="add" data-add="${p.id}">Agregar a la bolsa +</button></article>`).join('');
}
function renderCart() {
 let total=0,count=0;
 $('#cart-items').innerHTML = [...cart].map(([id,quantity])=>{const p=catalog.find(p=>p.id===id);total+=p.price*quantity;count+=quantity;return `<div class="cart-row"><div><strong>${p.name}</strong><small>${money(p.price)} / unidad</small></div><div class="quantity"><button type="button" data-change="${id}" data-delta="-1" aria-label="Quitar una unidad de ${p.name}">−</button><span>${quantity}</span><button type="button" data-change="${id}" data-delta="1" aria-label="Agregar una unidad de ${p.name}">+</button></div></div>`}).join('')||'<p class="muted">Tu próximo movimiento empieza en la colección.</p>';
 $('#bag-count').textContent=count;$('#total').textContent=money(total);
}
function changed(){if(submitted){orderId=crypto.randomUUID();submitted=false;}$('#checkout-status').textContent='';renderCart()}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-add]');if(add){const n=cart.get(add.dataset.add)||0;if(n>=10)return;cart.set(add.dataset.add,n+1);changed();$('#toast').textContent='Agregado a tu bolsa';$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),1800)}
 const q=e.target.closest('[data-change]');if(q){let n=(cart.get(q.dataset.change)||0)+Number(q.dataset.delta);if(n>10)return;n>0?cart.set(q.dataset.change,n):cart.delete(q.dataset.change);changed()}
 const f=e.target.closest('[data-filter]');if(f){document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===f);b.setAttribute('aria-pressed',String(b===f))});renderProducts(f.dataset.filter)}
});
$('#open-cart').onclick=()=>{$('#cart').showModal();renderCart()};$('#close-cart').onclick=()=>$('#cart').close();
$('#new-order').onclick=()=>{cart.clear();orderId=crypto.randomUUID();submitted=false;$('#checkout').reset();changed()};
$('#checkout').addEventListener('submit',e=>{
 const url=window.VENTAS_CONFIG?.appsScriptUrl||'';
 if(!cart.size){e.preventDefault();$('#checkout-status').textContent='Agrega al menos un producto.';return}
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)){e.preventDefault();$('#checkout-status').textContent='La tienda está en preparación. El organizador debe conectar el registro antes de recibir compras. No se han enviado datos.';return}
 if(submitted){e.preventDefault();$('#checkout-status').textContent='Ya abrimos la confirmación. Si no llegó a registrarse, vuelve a intentarlo con el mismo código.';submitted=false;return}
 $('#checkout').action=url;
 $('#payload').value=JSON.stringify({id:orderId,name:$('#customer').value.trim(),email:$('#email').value.trim(),consent:$('#consent').checked,items:[...cart].map(([id,quantity])=>({id,quantity}))});
 submitted=true;$('#checkout-status').textContent='Solicitud enviada. Revisa la nueva pestaña para confirmar si la compra se registró. Esta pantalla no confirma el registro.';
});
renderProducts();renderCart();
