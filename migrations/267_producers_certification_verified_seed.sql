-- Seed verified organic registry links checked 2026-11-02.
-- No biodynamic Demeter/Biodyvin links found for Mas Des Mesures / Peira Levada.
-- Meigoon Ecocert certificate (2025-02-18): products listed "En conversion"; engagement 2023-10-19.
-- Gregory White, Hors Saison, Ugo Lestelle intentionally left without URL
-- (Ugo Lestelle Agence Bio etatCertification = ARRETEE as of check date).

UPDATE public.producers AS p
SET
  certification_verified_url = v.url,
  certification_in_conversion = v.in_conversion
FROM (
  VALUES
    (
      'Château del Ranq',
      'https://certificat.ecocert.com/entreprise/AFDCFE26-888A-48A7-8DE2-CB744BE55D31',
      false
    ),
    (
      'Clos Fantine',
      'https://certifie.bureauveritas.fr/organisme/55343',
      false
    ),
    (
      'Domaine Les Serrals',
      'https://certificat.ecocert.com/entreprise/FF876E43-DAAF-45A4-9441-F31EFA9C4BD8',
      false
    ),
    (
      'Julien Peyras',
      'https://certificat.ecocert.com/entreprise/5BB6C793-C442-4E0E-B40A-591CECC6C01E',
      false
    ),
    (
      'La Graine Sauvage',
      'https://certifie.bureauveritas.fr/organisme/137915',
      false
    ),
    (
      'Mas d''Agalis',
      'https://certificat.ecocert.com/entreprise/B0F63DB2-AFEF-4765-B5FD-0973EA0FEE1B',
      false
    ),
    (
      'Pierre et l''Étoile',
      'https://certificat.ecocert.com/entreprise/E04C3260-549D-4438-9670-B3445B601EDD',
      false
    ),
    (
      'Thomas Chany',
      'https://certificat.ecocert.com/entreprise/146337BD-3616-4974-A3C2-D57CD5DAE871',
      false
    ),
    (
      'Mas Des Mesures',
      'https://bio.certipaq.solutions/certificats/fiche/56136/auge-vincent/',
      false
    ),
    (
      'Peira Levada',
      'https://certifie.bureauveritas.fr/organisme/127709',
      false
    ),
    (
      'Meigoon',
      'https://certificat.ecocert.com/entreprise/AFFACF70-4072-4674-842F-F1C730B01493',
      true
    )
) AS v(name, url, in_conversion)
WHERE p.name = v.name;

-- Explicit according-to-producer (no verified organic registry link).
UPDATE public.producers
SET
  certification_verified_url = NULL,
  certification_in_conversion = false
WHERE name IN (
  'Gregory White',
  'Hors Saison',
  'Ugo Lestelle'
);
