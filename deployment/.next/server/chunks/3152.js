"use strict";exports.id=3152,exports.ids=[3152],exports.modules={33152:(e,t,n)=>{n.d(t,{getAllWineBoxCalculations:()=>o});var i=n(89144);let r=new Map;async function a(e){let t=r.get(e);if(t&&Date.now()-t.timestamp<3e5)return t.data;let n=await (0,i.w)();try{let{data:t,error:i}=await n.from("wine_boxes").select(`
        id,
        name,
        description,
        handle,
        image_url,
        margin_percentage,
        wine_box_items (
          id,
          wine_id,
          quantity,
          wines (
            id,
            wine_name,
            vintage,
            cost_amount,
            exchange_rate,
            alcohol_tax_cents,
            base_price_cents
          )
        )
      `).eq("id",e).single();if(i||!t)return console.error("Error fetching wine box:",i),null;let a=0,o=0,l=[];for(let e of t.wine_box_items){let t=e.wines,n=t.cost_amount*(t.exchange_rate||1)+(t.alcohol_tax_cents||0)/100,i=n*e.quantity;a+=i,o+=e.quantity,l.push({wineId:t.id,wineName:t.wine_name,vintage:t.vintage,price:n,quantity:e.quantity})}let s=a*(t.margin_percentage/100),c=a+s,u=0;for(let e of t.wine_box_items){let t=e.wines.base_price_cents/100;u+=t*e.quantity}let w=u-c,m=w/u*100,d={wineBoxId:e,name:t.name,description:t.description,handle:t.handle,imageUrl:t.image_url,totalWinePrice:u,marginAmount:s,finalPrice:c,discountAmount:w,discountPercentage:m,bottleCount:o,wines:l};return r.set(e,{data:d,timestamp:Date.now()}),d}catch(e){return console.error("Error calculating wine box price:",e),null}}async function o(){let e="all-wine-boxes",t=r.get(e);if(t&&Date.now()-t.timestamp<3e5)return t.data;let n=await (0,i.w)();try{let{data:t,error:i}=await n.from("wine_boxes").select("id").eq("is_active",!0);if(i||!t)return console.error("Error fetching wine boxes:",i),[];let o=(await Promise.all(t.map(e=>a(e.id)))).filter(e=>null!==e);return r.set(e,{data:o,timestamp:Date.now()}),o}catch(e){return console.error("Error getting all wine box calculations:",e),[]}}},89144:(e,t,n)=>{n.d(t,{H:()=>o,w:()=>a});var i=n(44999),r=n(34386);async function a(){let e=await (0,i.UL)(),t="https://abrnvjqwpdkodgrtezeg.supabase.co",n="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicm52anF3cGRrb2RncnRlemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NzQwNjMsImV4cCI6MjA3MjI1MDA2M30.I_i63rAdVM51CKwic2GhNY5z7WKzA8p8OdVVh8-YiGs";if(!t||!n)throw console.error("Missing Supabase environment variables:"),console.error("NEXT_PUBLIC_SUPABASE_URL:",t?"SET":"MISSING"),console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:",n?"SET":"MISSING"),Error("Supabase environment variables are not configured. Please check your .env.local file.");return(0,r.createServerClient)(t,n,{cookies:{get:t=>e.get(t)?.value,set(e,t,n){console.log(`Cookie ${e} would be set to ${t}`)},remove(e,t){console.log(`Cookie ${e} would be removed`)}}})}async function o(){let e=await a(),{data:{user:t},error:n}=await e.auth.getUser();return n?(console.error("Error getting current user:",n),null):t}}};