/**
 * Offline SE postcode → approximate lat/lon when Mapbox is unavailable.
 *
 * Used only as a geocode substitute so delivery-zone *radius* matching can still
 * run (Göteborg / Malmö / Uppsala / …). Does NOT invent a Stockholm delivery
 * zone for non-Stockholm postals — callers still match against real zone rows.
 *
 * Indelning: PostNords 86 postnummerområden (tvåsiffrig serie 10–98).
 * Oanvända serier enligt PostNord faktablad «Postnummersystemet i Sverige»
 * (PTS/PostNord, 2017-12-13): 32, 48, 49 (och 99). Okända/oanvända → null;
 * Stockholm gissas aldrig för andra områden.
 *
 * Punkter: huvudort / typisk kommunort för området (inte storstadens centrum
 * när området ligger i periferin — t.ex. 15 Södertälje, 24 Eslöv, 43 Kungsbacka,
 * 44 Kungälv, 45 Uddevalla). Koordinater ≈ kommun-/ortcentrum (WGS84).
 */

export type SePostalApproxGeocode = {
  lat: number;
  lon: number;
  /** Human label for logs / display_name. */
  place: string;
  /** Two-digit postcode band used. */
  band: string;
};

/** Extract first 5-digit SE postal from a free-form address / query. */
export function extractSePostalDigits(
  address: string | null | undefined,
): string | null {
  const m = String(address ?? "").match(/\b(\d{5})\b/);
  return m?.[1] ?? null;
}

/**
 * Approximate WGS84 for a Swedish 5-digit postcode via 2-digit band.
 * Returns null when the band is unknown/unused (do not guess Stockholm).
 */
export function approxGeocodeSePostal(
  postcode: string | null | undefined,
): SePostalApproxGeocode | null {
  const digits = String(postcode ?? "").replace(/\D/g, "");
  if (digits.length < 2) return null;
  const band = digits.slice(0, 2);
  const n = Number.parseInt(band, 10);
  if (!Number.isFinite(n)) return null;

  // PostNord postnummerområden 10–98 (exkl. oanvända 32, 48, 49).
  // place = områdets huvudort; lat/lon ≈ den ortens centrum.
  const table: Record<string, { lat: number; lon: number; place: string }> = {
    // Storstockholm 10–19
    "10": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "11": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "12": { lat: 59.278, lon: 18.012, place: "Hägersten" },
    "13": { lat: 59.3106, lon: 18.1637, place: "Nacka" },
    "14": { lat: 59.237, lon: 17.9819, place: "Huddinge" },
    "15": { lat: 59.1955, lon: 17.6252, place: "Södertälje" },
    "16": { lat: 59.4028, lon: 17.944, place: "Kista" },
    "17": { lat: 59.3615, lon: 17.9711, place: "Sundbyberg" },
    "18": { lat: 59.4439, lon: 18.0687, place: "Täby" },
    "19": { lat: 59.6214, lon: 17.8547, place: "Märsta" },
    // Skåne / Blekinge 20–29
    "20": { lat: 55.6059, lon: 13.0007, place: "Malmö" },
    "21": { lat: 55.6059, lon: 13.0007, place: "Malmö" },
    "22": { lat: 55.7047, lon: 13.191, place: "Lund" },
    "23": { lat: 55.375, lon: 13.1569, place: "Trelleborg" },
    "24": { lat: 55.8391, lon: 13.3039, place: "Eslöv" },
    "25": { lat: 56.0467, lon: 12.6944, place: "Helsingborg" },
    "26": { lat: 56.2428, lon: 12.8622, place: "Ängelholm" },
    "27": { lat: 55.4295, lon: 13.8204, place: "Ystad" },
    "28": { lat: 56.1591, lon: 13.7664, place: "Hässleholm" },
    "29": { lat: 56.0294, lon: 14.1567, place: "Kristianstad" },
    // Halland / Småland / Blekinge 30–39 (32 oanvänd)
    "30": { lat: 56.6745, lon: 12.8568, place: "Halmstad" },
    "31": { lat: 56.9055, lon: 12.4912, place: "Falkenberg" },
    "33": { lat: 57.186, lon: 14.04, place: "Värnamo" },
    "34": { lat: 56.8332, lon: 13.9408, place: "Ljungby" },
    "35": { lat: 56.8777, lon: 14.8091, place: "Växjö" },
    "36": { lat: 56.525, lon: 14.978, place: "Tingsryd" },
    "37": { lat: 56.1612, lon: 15.5869, place: "Karlskrona" },
    "38": { lat: 56.7444, lon: 15.907, place: "Nybro" },
    "39": { lat: 56.6634, lon: 16.3566, place: "Kalmar" },
    // Göteborg / Bohuslän / Väst 40–47 (48–49 oanvända)
    "40": { lat: 57.7089, lon: 11.9746, place: "Göteborg" },
    "41": { lat: 57.7089, lon: 11.9746, place: "Göteborg" },
    "42": { lat: 57.728, lon: 11.89, place: "Hisingen" },
    "43": { lat: 57.4876, lon: 12.0766, place: "Kungsbacka" },
    "44": { lat: 57.8708, lon: 11.9805, place: "Kungälv" },
    "45": { lat: 58.3498, lon: 11.9424, place: "Uddevalla" },
    "46": { lat: 58.2837, lon: 12.2886, place: "Trollhättan" },
    "47": { lat: 57.9917, lon: 11.5514, place: "Skärhamn" },
    // Östra Västra Götaland / Jönköping / Östergötland 50–59
    "50": { lat: 57.721, lon: 12.9401, place: "Borås" },
    "51": { lat: 57.5073, lon: 12.6955, place: "Kinna" },
    "52": { lat: 57.7916, lon: 13.4142, place: "Ulricehamn" },
    "53": { lat: 58.5052, lon: 13.1577, place: "Lidköping" },
    "54": { lat: 58.3912, lon: 13.8451, place: "Skövde" },
    "55": { lat: 57.7826, lon: 14.1618, place: "Jönköping" },
    "56": { lat: 57.7919, lon: 14.2755, place: "Huskvarna" },
    "57": { lat: 57.6531, lon: 14.6968, place: "Nässjö" },
    "58": { lat: 58.4108, lon: 15.6214, place: "Linköping" },
    "59": { lat: 58.537, lon: 15.0365, place: "Motala" },
    // Södermanland / Gotland / Värmland 60–69
    "60": { lat: 58.5877, lon: 16.1924, place: "Norrköping" },
    "61": { lat: 58.753, lon: 17.0075, place: "Nyköping" },
    "62": { lat: 57.6348, lon: 18.2948, place: "Visby" },
    "63": { lat: 59.3667, lon: 16.5077, place: "Eskilstuna" },
    "64": { lat: 58.9959, lon: 16.2072, place: "Katrineholm" },
    "65": { lat: 59.3793, lon: 13.5036, place: "Karlstad" },
    "66": { lat: 59.1327, lon: 12.929, place: "Säffle" },
    "67": { lat: 59.6553, lon: 12.5915, place: "Arvika" },
    "68": { lat: 59.3098, lon: 14.1081, place: "Kristinehamn" },
    "69": { lat: 59.3267, lon: 14.5239, place: "Karlskoga" },
    // Örebro / Västmanland / Uppsala / Dalarna 70–79
    "70": { lat: 59.2741, lon: 15.2066, place: "Örebro" },
    "71": { lat: 59.592, lon: 15.228, place: "Lindesberg" },
    "72": { lat: 59.6099, lon: 16.5448, place: "Västerås" },
    "73": { lat: 59.514, lon: 15.9918, place: "Köping" },
    "74": { lat: 59.6356, lon: 17.0778, place: "Enköping" },
    "75": { lat: 59.8586, lon: 17.6389, place: "Uppsala" },
    "76": { lat: 59.7578, lon: 18.705, place: "Norrtälje" },
    "77": { lat: 60.1496, lon: 15.1823, place: "Ludvika" },
    "78": { lat: 60.4858, lon: 15.4371, place: "Borlänge" },
    "79": { lat: 60.6065, lon: 15.6355, place: "Falun" },
    // Norrlandskusten / inland 80–89
    "80": { lat: 60.6749, lon: 17.1413, place: "Gävle" },
    "81": { lat: 60.6167, lon: 16.7667, place: "Sandviken" },
    "82": { lat: 61.7276, lon: 17.1055, place: "Hudiksvall" },
    "83": { lat: 63.1792, lon: 14.6357, place: "Östersund" },
    "84": { lat: 62.0341, lon: 14.359, place: "Sveg" },
    "85": { lat: 62.3908, lon: 17.3069, place: "Sundsvall" },
    "86": { lat: 62.4875, lon: 17.3264, place: "Timrå" },
    "87": { lat: 62.6323, lon: 17.9379, place: "Härnösand" },
    "88": { lat: 63.1667, lon: 17.2667, place: "Sollefteå" },
    "89": { lat: 63.2909, lon: 18.7153, place: "Örnsköldsvik" },
    // Västerbotten / Norrbotten 90–98
    "90": { lat: 63.8258, lon: 20.263, place: "Umeå" },
    "91": { lat: 63.9067, lon: 19.7511, place: "Vännäs" },
    "92": { lat: 64.5954, lon: 18.7386, place: "Lycksele" },
    "93": { lat: 64.7507, lon: 20.9528, place: "Skellefteå" },
    "94": { lat: 65.3172, lon: 21.4794, place: "Piteå" },
    "95": { lat: 65.853, lon: 23.132, place: "Kalix" },
    "96": { lat: 65.8251, lon: 21.6886, place: "Boden" },
    "97": { lat: 65.5842, lon: 22.1547, place: "Luleå" },
    "98": { lat: 67.8558, lon: 20.2253, place: "Kiruna" },
  };

  const hit = table[band];
  if (!hit) return null;
  return { lat: hit.lat, lon: hit.lon, place: hit.place, band };
}
