(()=>{var e={};e.id=1405,e.ids=[1405],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},8207:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>x,routeModule:()=>l,serverHooks:()=>g,workAsyncStorage:()=>_,workUnitAsyncStorage:()=>v});var s={};t.r(s),t.d(s,{GET:()=>p});var i=t(96559),a=t(48088),o=t(37719),n=t(32190),d=t(83008);let u=process.env.SUPABASE_SERVICE_ROLE_KEY,c=(0,d.UU)("https://abrnvjqwpdkodgrtezeg.supabase.co",u);async function p(e){try{let{searchParams:r}=new URL(e.url),t=r.get("reservationId");if(!t)return n.NextResponse.json({error:"Reservation ID is required"},{status:400});let{data:s,error:i}=await c.from("order_reservations").select(`
        *,
        user_addresses!inner (
          full_name,
          email,
          phone,
          address_street,
          address_postcode,
          address_city,
          country_code
        )
      `).eq("id",t).single();if(i||!s)return n.NextResponse.json({error:"Reservation not found"},{status:404});let{data:a,error:o}=await c.from("order_reservation_items").select(`
        quantity,
        price_band,
        wines!inner (
          id,
          wine_name,
          vintage,
          grape_varieties,
          color,
          base_price_cents,
          producers!inner (
            name,
            region,
            country_code
          )
        )
      `).eq("reservation_id",t);o&&console.error("Failed to fetch reservation items:",o);let d=null;if(s.pickup_zone_id||s.delivery_zone_id){let{data:e,error:r}=await c.from("pallet_zones").select("id, name, zone_type").in("id",[s.pickup_zone_id,s.delivery_zone_id].filter(Boolean));!r&&e&&(d={pickup:e.find(e=>e.id===s.pickup_zone_id),delivery:e.find(e=>e.id===s.delivery_zone_id)})}let u=null;if(d?.pickup&&d?.delivery){let{data:e,error:r}=await c.from("pallets").select(`
          id,
          name,
          bottle_capacity,
          pickup_zone_id,
          delivery_zone_id
        `).eq("pickup_zone_id",d.pickup.id).eq("delivery_zone_id",d.delivery.id).single();if(!r&&e){let{data:r,error:t}=await c.from("bookings").select("quantity"),s=t?0:r?.reduce((e,r)=>e+r.quantity,0)||0;u={...e,currentBottles:s,remainingBottles:e.bottle_capacity-s}}}let{data:p,error:l}=await c.from("reservation_tracking").select("tracking_code, created_at").eq("reservation_id",t).single();return n.NextResponse.json({reservation:{id:s.id,status:s.status,created_at:s.created_at,address:s.user_addresses,zones:d,pallet:u,tracking:p?{code:"string"==typeof p.tracking_code?p.tracking_code:p.tracking_code?.data||"N/A",created_at:p.created_at}:null},items:a||[]})}catch(e){return console.error("Error fetching reservation details:",e),n.NextResponse.json({error:"Failed to fetch reservation details"},{status:500})}}let l=new i.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/reservation-details/route",pathname:"/api/reservation-details",filename:"route",bundlePath:"app/api/reservation-details/route"},resolvedPagePath:"/Users/axelsamuelson/Downloads/crowdvine_01/app/api/reservation-details/route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:_,workUnitAsyncStorage:v,serverHooks:g}=l;function x(){return(0,o.patchFetch)({workAsyncStorage:_,workUnitAsyncStorage:v})}},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11997:e=>{"use strict";e.exports=require("punycode")},27910:e=>{"use strict";e.exports=require("stream")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79551:e=>{"use strict";e.exports=require("url")},81630:e=>{"use strict";e.exports=require("http")},96487:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[4447,3008,580],()=>t(8207));module.exports=s})();