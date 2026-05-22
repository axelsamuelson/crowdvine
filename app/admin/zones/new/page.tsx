import ZoneForm from "@/components/admin/zone-form";

export default function NewZonePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Ny upphämtningszon
        </h1>
        <p className="text-gray-600 dark:text-zinc-400">
          Vingård eller producent. För kund + leverans, använd{" "}
          <a href="/admin/geo-zones" className="underline">
            Vinzoner & leverans
          </a>
          .
        </p>
      </div>

      <ZoneForm pickupOnly />
    </div>
  );
}
