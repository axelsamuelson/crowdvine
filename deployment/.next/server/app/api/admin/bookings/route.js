(()=>{var e={};e.id=1206,e.ids=[1206,1268],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11268:(e,r,t)=>{"use strict";t.d(r,{getSupabaseAdmin:()=>o});var s=t(83008);function o(){let e="https://abrnvjqwpdkodgrtezeg.supabase.co",r=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!e||!r)throw Error("Missing Supabase admin credentials");return(0,s.UU)(e,r)}},11997:e=>{"use strict";e.exports=require("punycode")},27910:e=>{"use strict";e.exports=require("stream")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66377:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>b,routeModule:()=>c,serverHooks:()=>x,workAsyncStorage:()=>l,workUnitAsyncStorage:()=>g});var s={};t.r(s),t.d(s,{DELETE:()=>p,GET:()=>d});var o=t(96559),n=t(48088),i=t(37719),a=t(32190),u=t(11268);async function d(){try{let e=(0,u.getSupabaseAdmin)(),{data:r,error:t}=await e.from("bookings").select(`
        id,
        quantity,
        band,
        status,
        created_at,
        user_id,
        pallet_id,
        wines(
          id,
          wine_name,
          vintage,
          grape_varieties,
          color,
          base_price_cents,
          producers(
            name,
            region,
            country_code
          )
        ),
        pallets(
          id,
          name,
          bottle_capacity
        )
      `).order("created_at",{ascending:!1});if(t)return console.error("Error fetching bookings:",t),a.NextResponse.json({error:"Failed to fetch bookings"},{status:500});console.log(`Found ${r?.length||0} bookings`);let{data:s,error:o}=await e.from("order_reservations").select(`
        id,
        status,
        created_at,
        user_id,
        order_id
      `).order("created_at",{ascending:!1});if(o)return console.error("Error fetching reservations:",o),a.NextResponse.json({bookings:r||[],reservations:[]});return console.log(`Found ${s?.length||0} reservations`),a.NextResponse.json({bookings:r||[],reservations:s||[]})}catch(e){return console.error("Error in bookings API:",e),a.NextResponse.json({error:"Internal server error"},{status:500})}}async function p(e){try{let{bookingIds:r}=await e.json();if(!r||!Array.isArray(r)||0===r.length)return a.NextResponse.json({error:"No booking IDs provided"},{status:400});let t=(0,u.getSupabaseAdmin)(),{error:s}=await t.from("bookings").delete().in("id",r);if(s)return console.error("Error deleting bookings:",s),a.NextResponse.json({error:"Failed to delete bookings"},{status:500});return a.NextResponse.json({message:`Successfully deleted ${r.length} booking(s)`})}catch(e){return console.error("Error in delete bookings API:",e),a.NextResponse.json({error:"Internal server error"},{status:500})}}let c=new o.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/admin/bookings/route",pathname:"/api/admin/bookings",filename:"route",bundlePath:"app/api/admin/bookings/route"},resolvedPagePath:"/Users/axelsamuelson/Downloads/crowdvine_01/app/api/admin/bookings/route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:l,workUnitAsyncStorage:g,serverHooks:x}=c;function b(){return(0,i.patchFetch)({workAsyncStorage:l,workUnitAsyncStorage:g})}},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79551:e=>{"use strict";e.exports=require("url")},81630:e=>{"use strict";e.exports=require("http")},96487:()=>{}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[4447,3008,580],()=>t(66377));module.exports=s})();