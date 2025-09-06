"use client";

import { useEffect, useState } from "react";

export default function EmailTestPage() {
  const [emailLog, setEmailLog] = useState<string>("");

  useEffect(() => {
    // Simulera email-log från senaste reservationen
    const log = `
=== EMAIL WOULD BE SENT ===
To: ave.samuelson@gmail.com
Subject: 🍷 Reservationsbekräftelse - 9982d38c-e152-4a90-a83f-b5ba1dd70744
Tracking Code: 62603403
Items: [
  {
    wineName: "Leno Dolce Sole",
    vintage: "2022",
    quantity: 6,
    price: "480.00"
  }
]
Total: 480.00 SEK
Status URL: http://localhost:3000/reservation-status?email=ave.samuelson%40gmail.com&trackingCode=62603403
=== EMAIL END ===
    `;
    setEmailLog(log);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Email Test Page</h1>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Senaste Email-log</h2>
        <pre className="bg-black text-green-400 p-4 rounded overflow-x-auto text-sm">
          {emailLog}
        </pre>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Status-koll med Tracking Code
        </h2>
        <p className="mb-4">
          Din reservation med tracking-kod <strong>62603403</strong> har skapats
          framgångsrikt!
        </p>
        <a
          href="/reservation-status?email=ave.samuelson@gmail.com&trackingCode=62603403"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Kolla Reservationsstatus →
        </a>
      </div>

      <div className="bg-yellow-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Nästa steg</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            Kör SQL-migrationen i Supabase Dashboard för att skapa{" "}
            <code>reservation_tracking</code> tabellen
          </li>
          <li>
            Konfigurera SMTP-inställningar i <code>.env.local</code> för att få
            riktiga emails
          </li>
          <li>Testa hela flödet igen</li>
        </ol>
      </div>
    </div>
  );
}
