(()=>{var e={};e.id=7823,e.ids=[7823],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11997:e=>{"use strict";e.exports=require("punycode")},27910:e=>{"use strict";e.exports=require("stream")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79551:e=>{"use strict";e.exports=require("url")},81630:e=>{"use strict";e.exports=require("http")},89144:(e,r,t)=>{"use strict";t.d(r,{H:()=>n,w:()=>o});var s=t(44999),a=t(34386);async function o(){let e=await (0,s.UL)(),r="https://abrnvjqwpdkodgrtezeg.supabase.co",t="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicm52anF3cGRrb2RncnRlemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NzQwNjMsImV4cCI6MjA3MjI1MDA2M30.I_i63rAdVM51CKwic2GhNY5z7WKzA8p8OdVVh8-YiGs";if(!r||!t)throw console.error("Missing Supabase environment variables:"),console.error("NEXT_PUBLIC_SUPABASE_URL:",r?"SET":"MISSING"),console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:",t?"SET":"MISSING"),Error("Supabase environment variables are not configured. Please check your .env.local file.");return(0,a.createServerClient)(r,t,{cookies:{get:r=>e.get(r)?.value,set(e,r,t){console.log(`Cookie ${e} would be set to ${r}`)},remove(e,r){console.log(`Cookie ${e} would be removed`)}}})}async function n(){let e=await o(),{data:{user:r},error:t}=await e.auth.getUser();return t?(console.error("Error getting current user:",t),null):r}},96487:()=>{},97332:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>m,routeModule:()=>c,serverHooks:()=>_,workAsyncStorage:()=>l,workUnitAsyncStorage:()=>p});var s={};t.r(s),t.d(s,{GET:()=>u});var a=t(96559),o=t(48088),n=t(37719),i=t(32190),d=t(89144);async function u(e){try{let r,t;let{searchParams:s}=new URL(e.url),a=s.get("email"),o=s.get("reservationId"),n=s.get("trackingCode");if(!a||!o&&!n)return i.NextResponse.json({error:"Email och antingen reservations-ID eller tracking-kod kr\xe4vs"},{status:400});let u=await (0,d.w)();if(n){let{data:e,error:s}=await u.from("reservation_tracking").select(`
          reservation_id,
          customer_email,
          customer_name
        `).eq("tracking_code",n).eq("customer_email",a).single();if(s||!e)return console.error("Tracking record not found:",s),i.NextResponse.json({error:"Reservationen hittades inte med den angivna tracking-koden"},{status:404});await u.from("reservation_tracking").update({last_accessed_at:new Date().toISOString()}).eq("tracking_code",n);let{data:o,error:d}=await u.from("order_reservations").select(`
          id,
          status,
          created_at,
          user_addresses!inner (
            full_name,
            email,
            address_street,
            address_postcode,
            address_city,
            country_code
          )
        `).eq("id",e.reservation_id).single();r=o,t=d}else{let{data:e,error:s}=await u.from("order_reservations").select(`
          id,
          status,
          created_at,
          user_addresses!inner (
            full_name,
            email,
            address_street,
            address_postcode,
            address_city,
            country_code
          )
        `).eq("id",o).eq("user_addresses.email",a).single();r=e,t=s}if(t||!r)return console.error("Reservation not found:",t),i.NextResponse.json({error:"Reservationen hittades inte"},{status:404});let{data:c,error:l}=await u.from("order_reservation_items").select(`
        quantity,
        price_band,
        campaign_items!inner (
          wine_name,
          vintage
        )
      `).eq("reservation_id",o);if(l)return console.error("Failed to get reservation items:",l),i.NextResponse.json({error:"Kunde inte h\xe4mta reservationsvaror"},{status:500});let p={id:r.id,status:r.status,created_at:r.created_at,customer_name:r.user_addresses.full_name,customer_email:r.user_addresses.email,items:c.map(e=>({wine_name:e.campaign_items.wine_name,vintage:e.campaign_items.vintage,quantity:e.quantity,price_band:e.price_band})),address:{street:r.user_addresses.address_street,postcode:r.user_addresses.address_postcode,city:r.user_addresses.address_city,country_code:r.user_addresses.country_code}};return i.NextResponse.json(p)}catch(e){return console.error("Error fetching reservation status:",e),i.NextResponse.json({error:"Ett fel uppstod n\xe4r reservationsstatus skulle h\xe4mtas"},{status:500})}}let c=new a.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/reservation-status/route",pathname:"/api/reservation-status",filename:"route",bundlePath:"app/api/reservation-status/route"},resolvedPagePath:"/Users/axelsamuelson/Downloads/crowdvine_01/app/api/reservation-status/route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:l,workUnitAsyncStorage:p,serverHooks:_}=c;function m(){return(0,n.patchFetch)({workAsyncStorage:l,workUnitAsyncStorage:p})}}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[4447,3008,4999,4386,580],()=>t(97332));module.exports=s})();