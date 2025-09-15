(()=>{var e={};e.id=6658,e.ids=[6658],e.modules={838:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>h,routeModule:()=>p,serverHooks:()=>v,workAsyncStorage:()=>m,workUnitAsyncStorage:()=>g});var o={};r.r(o),r.d(o,{POST:()=>u});var a=r(96559),s=r(48088),i=r(37719),n=r(32190),l=r(27069),c=r(89144),d=r(47628);async function u(e){try{console.log("=== DEBUG CHECKOUT START ===");let t=await e.json();console.log("Body:",JSON.stringify(t,null,2));let r=await l.m.getCart();if(console.log("Cart:",JSON.stringify(r,null,2)),!r||0===r.totalQuantity)return console.log("Cart is empty"),n.NextResponse.json({error:"Cart is empty"},{status:400});let o=await (0,c.H)();console.log("Current user:",o?.id||"null");let a=t.address;console.log("Saving address:",JSON.stringify(a,null,2));let s=await (0,c.w)(),{data:i,error:u}=await s.from("user_addresses").insert({user_id:o?.id||null,full_name:a.fullName,email:a.email,phone:a.phone,address_street:a.street,address_postcode:a.postcode,address_city:a.city,country_code:a.countryCode}).select().single();if(u)return console.error("Address error:",u),n.NextResponse.json({error:"Failed to save address"},{status:500});console.log("Address saved:",i),console.log("Creating reservation...");let{data:p,error:m}=await s.from("order_reservations").insert({user_id:o?.id||null,cart_id:r.id,address_id:i.id,status:"placed"}).select().single();if(m)return console.error("Reservation error:",m),n.NextResponse.json({error:"Failed to create reservation"},{status:500});console.log("Reservation created:",p),console.log("Creating reservation items...");let g=r.lines.map(e=>({reservation_id:p.id,wine_id:e.merchandise.id.replace("-default",""),quantity:e.quantity,price_band:e.cost.totalAmount.amount})),{error:v}=await s.from("order_reservation_items").insert(g);if(v)return console.error("Items error:",v),n.NextResponse.json({error:"Failed to create reservation items"},{status:500});console.log("Reservation items created"),console.log("Converting to bookings...");let h=r.lines.map(e=>({wine_id:e.merchandise.id.replace("-default",""),quantity:e.quantity,status:"reserved"})),{error:x}=await s.from("bookings").insert(h);if(x)return console.error("Bookings error:",x),n.NextResponse.json({error:"Failed to create bookings"},{status:500});console.log("Bookings created"),console.log("Creating tracking record...");let{data:w,error:f}=await s.rpc("generate_tracking_code");f&&console.error("Tracking code error:",f);let y=w?.data||Math.random().toString().slice(2,10),{data:C,error:b}=await s.from("reservation_tracking").insert({reservation_id:p.id,customer_email:a.email,customer_name:a.fullName,tracking_code:y}).select().single();b?console.error("Tracking error:",b):console.log("Tracking record created:",C),console.log("Sending email...");try{let e={reservationId:p.id,trackingCode:y,customerName:a.fullName,customerEmail:a.email,items:r.lines.map(e=>({wineName:e.merchandise.title.split(" ").slice(0,-1).join(" ")||"Ok\xe4nd vin",vintage:e.merchandise.title.split(" ").pop()||"N/A",quantity:e.quantity,price:e.cost.totalAmount.amount})),totalAmount:r.cost.totalAmount.amount,address:{street:a.street,postcode:a.postcode,city:a.city,countryCode:a.countryCode},createdAt:p.created_at},t=await d.g.sendReservationConfirmation(e);console.log("Email sent:",t)}catch(e){console.error("Email error:",e)}console.log("Clearing cart..."),await l.m.clearCart(),console.log("=== DEBUG CHECKOUT END ===");let k=`/checkout/success?success=true&reservationId=${p.id}&message=${encodeURIComponent("Reservation placed successfully")}`;return n.NextResponse.redirect(new URL(k,e.url))}catch(e){return console.error("=== DEBUG CHECKOUT ERROR ==="),console.error("Error:",e),console.error("Stack:",e.stack),n.NextResponse.json({error:e.message},{status:500})}}let p=new a.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/debug/checkout/route",pathname:"/api/debug/checkout",filename:"route",bundlePath:"app/api/debug/checkout/route"},resolvedPagePath:"/Users/axelsamuelson/Downloads/crowdvine_01/app/api/debug/checkout/route.ts",nextConfigOutput:"",userland:o}),{workAsyncStorage:m,workUnitAsyncStorage:g,serverHooks:v}=p;function h(){return(0,i.patchFetch)({workAsyncStorage:m,workUnitAsyncStorage:g})}},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11997:e=>{"use strict";e.exports=require("punycode")},14985:e=>{"use strict";e.exports=require("dns")},21820:e=>{"use strict";e.exports=require("os")},27069:(e,t,r)=>{"use strict";r.d(t,{m:()=>l});var o=r(89144),a=r(44999),s=r(55511);let i="cv_cart_id";async function n(){let e=await (0,a.UL)(),t=e.get(i)?.value;return t||(t=(0,s.randomUUID)(),e.set(i,t,{httpOnly:!0,sameSite:"lax",path:"/",maxAge:7776e3,secure:!0})),t}class l{static async ensureCart(){let e=await n(),t=await (0,o.w)(),{data:r,error:a}=await t.from("carts").select("id").eq("session_id",e).single();if(!r){let{data:r,error:o}=await t.from("carts").insert({session_id:e}).select("id").single();if(o)throw Error("Failed to create cart");return r.id}return r.id}static async getCart(){try{await n();let e=await (0,o.w)(),{data:t,error:r}=await e.from("cart_items").select(`
          id,
          quantity,
          wines (
            id,
            handle,
            wine_name,
            vintage,
            label_image_path,
            base_price_cents
          )
        `).eq("cart_id",await this.ensureCart()).order("created_at",{ascending:!1});if(r)return console.error("Failed to get cart items:",r),null;if(!t||0===t.length)return{id:await this.ensureCart(),checkoutUrl:"/checkout",cost:{subtotalAmount:{amount:"0.00",currencyCode:"SEK"},totalAmount:{amount:"0.00",currencyCode:"SEK"},totalTaxAmount:{amount:"0.00",currencyCode:"SEK"}},totalQuantity:0,lines:[]};let a=t.map(e=>({id:e.id,quantity:e.quantity,cost:{totalAmount:{amount:(e.wines.base_price_cents*e.quantity/100).toFixed(2),currencyCode:"SEK"}},merchandise:{id:e.wines.id,title:`${e.wines.wine_name} ${e.wines.vintage}`,selectedOptions:[],product:{id:e.wines.id,title:`${e.wines.wine_name} ${e.wines.vintage}`,handle:e.wines.handle,description:"",descriptionHtml:"",productType:"wine",categoryId:"",options:[],variants:[{id:`${e.wines.id}-default`,title:"750 ml",availableForSale:!0,price:{amount:(e.wines.base_price_cents/100).toFixed(2),currencyCode:"SEK"},selectedOptions:[]}],priceRange:{minVariantPrice:{amount:(e.wines.base_price_cents/100).toFixed(2),currencyCode:"SEK"},maxVariantPrice:{amount:(e.wines.base_price_cents/100).toFixed(2),currencyCode:"SEK"}},featuredImage:{id:`${e.wines.id}-img`,url:e.wines.label_image_path,altText:e.wines.wine_name,width:600,height:600},images:[{id:`${e.wines.id}-img`,url:e.wines.label_image_path,altText:e.wines.wine_name,width:600,height:600}],seo:{title:e.wines.wine_name,description:""},tags:[],availableForSale:!0,currencyCode:"SEK",updatedAt:new Date().toISOString(),createdAt:new Date().toISOString()}}})),s=a.reduce((e,t)=>e+parseFloat(t.cost.totalAmount.amount),0);return{id:await this.ensureCart(),checkoutUrl:"/checkout",cost:{subtotalAmount:{amount:s.toFixed(2),currencyCode:"SEK"},totalAmount:{amount:s.toFixed(2),currencyCode:"SEK"},totalTaxAmount:{amount:"0.00",currencyCode:"SEK"}},totalQuantity:a.reduce((e,t)=>e+t.quantity,0),lines:a}}catch(e){return console.error("=== CART SERVICE GET CART ERROR ==="),console.error("CartService.getCart error:",e),console.error("Error stack:",e instanceof Error?e.stack:"No stack trace"),console.error("=== CART SERVICE GET CART ERROR END ==="),null}}static async addItem(e,t=1){try{let r=await this.ensureCart(),a=await (0,o.w)(),{data:s,error:i}=await a.from("cart_items").select("id, quantity").eq("cart_id",r).eq("wine_id",e).single();if(i&&"PGRST116"!==i.code&&console.error("Error checking for existing item:",i),s){let{data:e,error:r}=await a.from("cart_items").update({quantity:s.quantity+t}).eq("id",s.id).select("*").single();if(r)throw console.error("Failed to update cart item:",r),Error("Failed to update cart item")}else{let{data:o,error:s}=await a.from("cart_items").insert({cart_id:r,wine_id:e,quantity:t}).select("*").single();if(s)throw console.error("Failed to add cart item:",s),Error("Failed to add cart item")}return await this.getCart()}catch(e){return console.error("=== CART SERVICE ADD ITEM ERROR ==="),console.error("CartService.addItem error:",e),console.error("Error stack:",e instanceof Error?e.stack:"No stack trace"),console.error("=== CART SERVICE ADD ITEM ERROR END ==="),null}}static async updateItem(e,t){try{let r=await (0,o.w)();if(t<=0){let{error:t}=await r.from("cart_items").delete().eq("id",e);if(t)throw console.error("Failed to remove cart item:",t),Error("Failed to remove cart item")}else{let{error:o}=await r.from("cart_items").update({quantity:t}).eq("id",e);if(o)throw console.error("Failed to update cart item:",o),Error("Failed to update cart item")}return await this.getCart()}catch(e){return console.error("CartService.updateItem error:",e),null}}static async removeItem(e){try{let t=await (0,o.w)(),{error:r}=await t.from("cart_items").delete().eq("id",e);if(r)throw console.error("Failed to remove cart item:",r),Error("Failed to remove cart item");return await this.getCart()}catch(e){return console.error("CartService.removeItem error:",e),null}}static async clearCart(){try{await n();let e=await (0,o.w)(),{error:t}=await e.from("cart_items").delete().eq("cart_id",await this.ensureCart());if(t)throw console.error("Failed to clear cart:",t),Error("Failed to clear cart")}catch(e){throw console.error("CartService.clearCart error:",e),e}}}},27910:e=>{"use strict";e.exports=require("stream")},28354:e=>{"use strict";e.exports=require("util")},29021:e=>{"use strict";e.exports=require("fs")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},34631:e=>{"use strict";e.exports=require("tls")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},47628:(e,t,r)=>{"use strict";r.d(t,{g:()=>s});var o=r(49526);class a{constructor(){this.transporter=null;let e={host:process.env.SMTP_HOST||"smtp.ethereal.email",port:parseInt(process.env.SMTP_PORT||"587"),secure:!1,auth:{user:process.env.SMTP_USER||"test@ethereal.email",pass:process.env.SMTP_PASS||"test-password"}};this.transporter=(0,o.oO)(e)}async sendReservationConfirmation(e){try{if(!process.env.SMTP_USER||"your-email@gmail.com"===process.env.SMTP_USER)return!0;let t=e.items.map(e=>`• ${e.wineName} ${e.vintage} - ${e.quantity} st - ${e.price} SEK`).join("\n"),r=`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2c3e50; margin: 0;">🍷 CrowdVine</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">Din vinreservation \xe4r bekr\xe4ftad</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hej ${e.customerName}!</h2>
            
            <p>Tack f\xf6r din reservation hos CrowdVine. Din order har mottagits och behandlas nu.</p>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📋 Reservationsdetaljer</h3>
              <p><strong>Reservations-ID:</strong> ${e.reservationId}</p>
              ${e.trackingCode?`<p><strong>Tracking-kod:</strong> <span style="font-family: monospace; font-weight: bold; color: #e74c3c;">${e.trackingCode}</span></p>`:""}
              <p><strong>Datum:</strong> ${new Date(e.createdAt).toLocaleDateString("sv-SE")}</p>
              <p><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">Placerad</span></p>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">🍷 Best\xe4llda viner</h3>
              <div style="font-family: monospace; background-color: white; padding: 15px; border-radius: 4px;">
                ${t}
              </div>
              <p style="text-align: right; font-weight: bold; margin-top: 15px;">
                Totalt: ${e.totalAmount} SEK
              </p>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📍 Leveransadress</h3>
              <p>${e.address.street}</p>
              <p>${e.address.postcode} ${e.address.city}</p>
              <p>${e.address.countryCode}</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">ℹ️ Viktig information</h3>
              <ul style="color: #856404;">
                <li>Ingen betalning har debiterats \xe4nnu</li>
                <li>Vi debiterar endast n\xe4r en pall bildas</li>
                <li>Du kan avbryta reservationen n\xe4r som helst f\xf6re pall-bildning</li>
                <li>Vi meddelar dig via email n\xe4r din pall \xe4r redo</li>
              </ul>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3 style="color: #0c5460; margin-top: 0;">🔍 Kolla din reservationsstatus</h3>
              <p style="color: #0c5460;">
                Du kan kolla status p\xe5 din reservation genom att bes\xf6ka:
                <br>
                <a href="http://localhost:3000/reservation-status?email=${encodeURIComponent(e.customerEmail)}&${e.trackingCode?`trackingCode=${e.trackingCode}`:`reservationId=${e.reservationId}`}" 
                   style="color: #17a2b8; text-decoration: none; font-weight: bold;">
                  Kolla reservationsstatus →
                </a>
              </p>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
              Har du fr\xe5gor? Kontakta oss p\xe5 support@crowdvine.se
            </p>
          </div>
          
          <div style="background-color: #34495e; padding: 20px; text-align: center; color: white;">
            <p style="margin: 0; font-size: 14px;">\xa9 2024 CrowdVine. Alla r\xe4ttigheter f\xf6rbeh\xe5llna.</p>
          </div>
        </div>
      `,o={from:`"CrowdVine" <${process.env.SMTP_USER||"noreply@crowdvine.se"}>`,to:e.customerEmail,subject:`🍷 Reservationsbekr\xe4ftelse - ${e.reservationId}`,html:r,text:`
          CrowdVine - Reservationsbekr\xe4ftelse
          
          Hej ${e.customerName}!
          
          Din reservation har mottagits och behandlas nu.
          
          Reservations-ID: ${e.reservationId}
          ${e.trackingCode?`Tracking-kod: ${e.trackingCode}`:""}
          Datum: ${new Date(e.createdAt).toLocaleDateString("sv-SE")}
          Status: Placerad
          
          Best\xe4llda viner:
          ${e.items.map(e=>`- ${e.wineName} ${e.vintage} - ${e.quantity} st - ${e.price} SEK`).join("\n")}
          
          Totalt: ${e.totalAmount} SEK
          
          Leveransadress:
          ${e.address.street}
          ${e.address.postcode} ${e.address.city}
          ${e.address.countryCode}
          
          Viktig information:
          - Ingen betalning har debiterats \xe4nnu
          - Vi debiterar endast n\xe4r en pall bildas
          - Du kan avbryta reservationen n\xe4r som helst f\xf6re pall-bildning
          - Vi meddelar dig via email n\xe4r din pall \xe4r redo
          
          Kolla din reservationsstatus:
          http://localhost:3000/reservation-status?email=${encodeURIComponent(e.customerEmail)}&${e.trackingCode?`trackingCode=${e.trackingCode}`:`reservationId=${e.reservationId}`}
          
          Har du fr\xe5gor? Kontakta oss p\xe5 support@crowdvine.se
        `},a=await this.transporter.sendMail(o);return console.log("Email sent successfully:",a.messageId),!0}catch(e){return console.error("Failed to send email:",e),!1}}async sendReservationStatusUpdate(e){try{let t=`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2c3e50; margin: 0;">🍷 CrowdVine</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">Statusuppdatering f\xf6r din reservation</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hej ${e.customerName}!</h2>
            
            <p>Din reservation har uppdaterats med ny status.</p>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📋 Statusuppdatering</h3>
              <p><strong>Reservations-ID:</strong> ${e.reservationId}</p>
              <p><strong>Ny status:</strong> <span style="color: #27ae60; font-weight: bold;">${e.status}</span></p>
              <p><strong>Meddelande:</strong> ${e.message}</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3 style="color: #0c5460; margin-top: 0;">🔍 Kolla din reservationsstatus</h3>
              <p style="color: #0c5460;">
                Du kan kolla status p\xe5 din reservation genom att bes\xf6ka:
                <br>
                <a href="http://localhost:3000/reservation-status?email=${encodeURIComponent(e.customerEmail)}&reservationId=${e.reservationId}" 
                   style="color: #17a2b8; text-decoration: none; font-weight: bold;">
                  Kolla reservationsstatus →
                </a>
              </p>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
              Har du fr\xe5gor? Kontakta oss p\xe5 support@crowdvine.se
            </p>
          </div>
          
          <div style="background-color: #34495e; padding: 20px; text-align: center; color: white;">
            <p style="margin: 0; font-size: 14px;">\xa9 2024 CrowdVine. Alla r\xe4ttigheter f\xf6rbeh\xe5llna.</p>
          </div>
        </div>
      `,r={from:`"CrowdVine" <${process.env.SMTP_USER||"noreply@crowdvine.se"}>`,to:e.customerEmail,subject:`🍷 Statusuppdatering - ${e.reservationId}`,html:t},o=await this.transporter.sendMail(r);return console.log("Status update email sent successfully:",o.messageId),!0}catch(e){return console.error("Failed to send status update email:",e),!1}}}let s=new a},55511:e=>{"use strict";e.exports=require("crypto")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79551:e=>{"use strict";e.exports=require("url")},79646:e=>{"use strict";e.exports=require("child_process")},81630:e=>{"use strict";e.exports=require("http")},89144:(e,t,r)=>{"use strict";r.d(t,{H:()=>i,w:()=>s});var o=r(44999),a=r(34386);async function s(){let e=await (0,o.UL)(),t="https://abrnvjqwpdkodgrtezeg.supabase.co",r="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicm52anF3cGRrb2RncnRlemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NzQwNjMsImV4cCI6MjA3MjI1MDA2M30.I_i63rAdVM51CKwic2GhNY5z7WKzA8p8OdVVh8-YiGs";if(!t||!r)throw console.error("Missing Supabase environment variables:"),console.error("NEXT_PUBLIC_SUPABASE_URL:",t?"SET":"MISSING"),console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:",r?"SET":"MISSING"),Error("Supabase environment variables are not configured. Please check your .env.local file.");return(0,a.createServerClient)(t,r,{cookies:{get:t=>e.get(t)?.value,set(e,t,r){console.log(`Cookie ${e} would be set to ${t}`)},remove(e,t){console.log(`Cookie ${e} would be removed`)}}})}async function i(){let e=await s(),{data:{user:t},error:r}=await e.auth.getUser();return r?(console.error("Error getting current user:",r),null):t}},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[4447,3008,4999,4386,580,9526],()=>r(838));module.exports=o})();