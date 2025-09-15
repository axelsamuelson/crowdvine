(()=>{var e={};e.id=6798,e.ids=[6798],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},14985:e=>{"use strict";e.exports=require("dns")},21820:e=>{"use strict";e.exports=require("os")},27910:e=>{"use strict";e.exports=require("stream")},28354:e=>{"use strict";e.exports=require("util")},29021:e=>{"use strict";e.exports=require("fs")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},34631:e=>{"use strict";e.exports=require("tls")},36669:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>m,routeModule:()=>p,serverHooks:()=>g,workAsyncStorage:()=>c,workUnitAsyncStorage:()=>u});var s={};r.r(s),r.d(s,{GET:()=>l});var o=r(96559),a=r(48088),i=r(37719),n=r(32190),d=r(47628);async function l(){try{let e=await d.g.sendReservationConfirmation({reservationId:"test-123",trackingCode:"12345678",customerName:"Test User",customerEmail:"test@example.com",items:[{wineName:"Test Wine",vintage:"2023",quantity:1,price:"100.00"}],totalAmount:"100.00",address:{street:"Test Street",postcode:"12345",city:"Test City",countryCode:"SE"},createdAt:new Date().toISOString()});return n.NextResponse.json({success:!0,emailSent:e,message:"Email service test completed"})}catch(e){return n.NextResponse.json({success:!1,error:e.message,stack:e.stack},{status:500})}}let p=new o.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/debug/email/route",pathname:"/api/debug/email",filename:"route",bundlePath:"app/api/debug/email/route"},resolvedPagePath:"/Users/axelsamuelson/Downloads/crowdvine_01/app/api/debug/email/route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:c,workUnitAsyncStorage:u,serverHooks:g}=p;function m(){return(0,i.patchFetch)({workAsyncStorage:c,workUnitAsyncStorage:u})}},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},47628:(e,t,r)=>{"use strict";r.d(t,{g:()=>a});var s=r(49526);class o{constructor(){this.transporter=null;let e={host:process.env.SMTP_HOST||"smtp.ethereal.email",port:parseInt(process.env.SMTP_PORT||"587"),secure:!1,auth:{user:process.env.SMTP_USER||"test@ethereal.email",pass:process.env.SMTP_PASS||"test-password"}};this.transporter=(0,s.oO)(e)}async sendReservationConfirmation(e){try{if(!process.env.SMTP_USER||"your-email@gmail.com"===process.env.SMTP_USER)return!0;let t=e.items.map(e=>`• ${e.wineName} ${e.vintage} - ${e.quantity} st - ${e.price} SEK`).join("\n"),r=`
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
      `,s={from:`"CrowdVine" <${process.env.SMTP_USER||"noreply@crowdvine.se"}>`,to:e.customerEmail,subject:`🍷 Reservationsbekr\xe4ftelse - ${e.reservationId}`,html:r,text:`
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
        `},o=await this.transporter.sendMail(s);return console.log("Email sent successfully:",o.messageId),!0}catch(e){return console.error("Failed to send email:",e),!1}}async sendReservationStatusUpdate(e){try{let t=`
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
      `,r={from:`"CrowdVine" <${process.env.SMTP_USER||"noreply@crowdvine.se"}>`,to:e.customerEmail,subject:`🍷 Statusuppdatering - ${e.reservationId}`,html:t},s=await this.transporter.sendMail(r);return console.log("Status update email sent successfully:",s.messageId),!0}catch(e){return console.error("Failed to send status update email:",e),!1}}}let a=new o},55511:e=>{"use strict";e.exports=require("crypto")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79551:e=>{"use strict";e.exports=require("url")},79646:e=>{"use strict";e.exports=require("child_process")},81630:e=>{"use strict";e.exports=require("http")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[4447,580,9526],()=>r(36669));module.exports=s})();