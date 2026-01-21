"use client";

import * as d3 from "d3";
import { AnimatePresence, motion } from "framer-motion";
import { feature } from "topojson-client";
import { useEffect, useMemo, useState } from "react";

interface GeoFeature {
  type: string;
  id?: string;
  geometry: any;
  properties: any;
}

const WIDTH = 1000;
const HEIGHT = 1100;

const METROPOLITAN_REGION_CODES = new Set([
  "11", // Île-de-France
  "24", // Centre-Val de Loire
  "27", // Bourgogne-Franche-Comté
  "28", // Normandie
  "32", // Hauts-de-France
  "44", // Grand Est
  "52", // Pays de la Loire
  "53", // Bretagne
  "75", // Nouvelle-Aquitaine
  "76", // Occitanie
  "84", // Auvergne-Rhône-Alpes
  "93", // Provence-Alpes-Côte d’Azur
  "94", // Corse
]);

// Department → region mapping (metropolitan France). Needed when department GeoJSON lacks a region_code property.
const REGION_CODE_BY_DEPT: Record<string, string> = {
  // 84 Auvergne-Rhône-Alpes
  "01": "84",
  "03": "84",
  "07": "84",
  "15": "84",
  "26": "84",
  "38": "84",
  "42": "84",
  "43": "84",
  "63": "84",
  "69": "84",
  "73": "84",
  "74": "84",
  // 27 Bourgogne-Franche-Comté
  "21": "27",
  "25": "27",
  "39": "27",
  "58": "27",
  "70": "27",
  "71": "27",
  "89": "27",
  "90": "27",
  // 53 Bretagne
  "22": "53",
  "29": "53",
  "35": "53",
  "56": "53",
  // 24 Centre-Val de Loire
  "18": "24",
  "28": "24",
  "36": "24",
  "37": "24",
  "41": "24",
  "45": "24",
  // 94 Corse
  "2A": "94",
  "2B": "94",
  // 44 Grand Est
  "08": "44",
  "10": "44",
  "51": "44",
  "52": "44",
  "54": "44",
  "55": "44",
  "57": "44",
  "67": "44",
  "68": "44",
  "88": "44",
  // 32 Hauts-de-France
  "02": "32",
  "59": "32",
  "60": "32",
  "62": "32",
  "80": "32",
  // 11 Île-de-France
  "75": "11",
  "77": "11",
  "78": "11",
  "91": "11",
  "92": "11",
  "93": "11",
  "94": "11",
  "95": "11",
  // 28 Normandie
  "14": "28",
  "27": "28",
  "50": "28",
  "61": "28",
  "76": "28",
  // 75 Nouvelle-Aquitaine
  "16": "75",
  "17": "75",
  "19": "75",
  "23": "75",
  "24": "75",
  "33": "75",
  "40": "75",
  "47": "75",
  "64": "75",
  "79": "75",
  "86": "75",
  "87": "75",
  // 76 Occitanie
  "09": "76",
  "11": "76",
  "12": "76",
  "30": "76",
  "31": "76",
  "32": "76",
  "34": "76",
  "46": "76",
  "48": "76",
  "65": "76",
  "66": "76",
  "81": "76",
  "82": "76",
  // 52 Pays de la Loire
  "44": "52",
  "49": "52",
  "53": "52",
  "72": "52",
  "85": "52",
  // 93 Provence-Alpes-Côte d’Azur
  "04": "93",
  "05": "93",
  "06": "93",
  "13": "93",
  "83": "93",
  "84": "93",
};

function getCode(f: any): string {
  return (
    String(f?.id ?? "").trim() ||
    String(f?.properties?.code ?? "").trim() ||
    String(f?.properties?.CODE ?? "").trim() ||
    String(f?.properties?.insee ?? "").trim()
  );
}

function getName(f: any): string {
  return (
    String(f?.properties?.name ?? "").trim() ||
    String(f?.properties?.nom ?? "").trim() ||
    String(f?.properties?.NOM ?? "").trim() ||
    String(f?.properties?.libelle ?? "").trim() ||
    getCode(f)
  );
}

function getRegionCodeFromDept(f: any): string {
  return (
    String(f?.properties?.region_code ?? "").trim() ||
    String(f?.properties?.REGION ?? "").trim() ||
    String(f?.properties?.code_region ?? "").trim() ||
    ""
  );
}

function normalizeDeptCode(raw: string) {
  const v = String(raw || "").trim().toUpperCase();
  // Preserve 2A/2B
  if (v === "2A" || v === "2B") return v;
  // numeric codes -> pad to 2 digits
  if (/^\d+$/.test(v)) return v.padStart(2, "0");
  // keep as-is
  return v;
}

function isMetropolitanRegion(regionCode: string) {
  return METROPOLITAN_REGION_CODES.has(String(regionCode || "").trim());
}

function isMetropolitanDepartment(deptCode: string) {
  const c = deptCode.toUpperCase();
  if (
    ["971", "972", "973", "974", "975", "976", "984", "986", "987", "988"].includes(
      c,
    )
  )
    return false;
  return true;
}

function toFeatures(data: any): GeoFeature[] {
  if (!data) return [];
  // GeoJSON
  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    return data.features as GeoFeature[];
  }
  // TopoJSON
  if (data.type === "Topology") {
    const obj =
      (data as any).objects?.france ||
      (data as any).objects?.regions ||
      (data as any).objects?.departments ||
      Object.values((data as any).objects || {})[0];
    if (!obj) return [];
    return (feature(data as any, obj as any).features as GeoFeature[]) || [];
  }
  return [];
}

export function FranceTopoMap() {
  const [regionsTopo, setRegionsTopo] = useState<any>(null);
  const [departmentsTopo, setDepartmentsTopo] = useState<any>(null);
  const [appellationsGeo, setAppellationsGeo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [step, setStep] = useState<
    "regions" | "departments" | "appellations"
  >("regions");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [hoveredAppellation, setHoveredAppellation] = useState<string | null>(
    null,
  );
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(
    null,
  );
  const [selectedDeptCode, setSelectedDeptCode] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setDataError(null);
        const fetchJson = async (path: string) => {
          const res = await fetch(path);
          const contentType = res.headers.get("content-type") || "";
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return {
              ok: false as const,
              error: `${path} returned ${res.status}. Body starts with: ${text.slice(0, 30)}`,
              data: null,
            };
          }
          const isJsonLike =
            contentType.includes("application/json") ||
            contentType.includes("application/topo+json") ||
            contentType.includes("application/geo+json") ||
            // Some hosts use vendor types like application/vnd.geo+json or +json variants
            contentType.includes("+json");
          if (!isJsonLike) {
            const text = await res.text().catch(() => "");
            return {
              ok: false as const,
              error: `${path} is not JSON (content-type=${contentType}). Body starts with: ${text.slice(0, 30)}`,
              data: null,
            };
          }
          return { ok: true as const, data: await res.json(), error: null };
        };

        const [regionsR, deptsR, appsR] = await Promise.all([
          fetchJson("/france_regions_metropolitan.json"),
          fetchJson("/france_departments_metropolitan.json"),
          fetchJson("/france_appellations.geojson"),
        ]);
        if (!regionsR.ok) setDataError((prev) => prev || regionsR.error);
        if (!deptsR.ok) setDataError((prev) => prev || deptsR.error);
        if (!appsR.ok) setDataError((prev) => prev || appsR.error);

        setRegionsTopo(regionsR.ok ? regionsR.data : null);
        setDepartmentsTopo(deptsR.ok ? deptsR.data : null);
        setAppellationsGeo(appsR.ok ? appsR.data : null);
      } catch (e) {
        setDataError(String((e as any)?.message || e));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const franceRegions = useMemo(() => {
    const feats = toFeatures(regionsTopo);
    // Filter to metropolitan-only if the dataset includes overseas regions
    return feats.filter((r: any) => isMetropolitanRegion(getCode(r)));
  }, [regionsTopo]);

  const franceDepartments = useMemo(() => {
    const feats = toFeatures(departmentsTopo);
    return feats.filter((d: any) =>
      isMetropolitanDepartment(normalizeDeptCode(getCode(d))),
    );
  }, [departmentsTopo]);

  const franceAppellations = useMemo(() => {
    // UCDavis file is GeoJSON FeatureCollection
    return toFeatures(appellationsGeo);
  }, [appellationsGeo]);

  const projection = useMemo(() => {
    return d3
      .geoMercator()
      .scale(2800)
      .center([2.2, 46.4])
      .translate([WIDTH / 2, HEIGHT / 2]);
  }, []);

  const geoPath = useMemo(() => d3.geoPath().projection(projection), [projection]);

  type Dot = { x: number; y: number };
  const [dotsByKey, setDotsByKey] = useState<Record<string, Dot[]>>({});

  const generateDots = (feat: GeoFeature, key: string, targetCount: number) => {
    const bounds = geoPath.bounds(feat as any);
    const [[x0, y0], [x1, y1]] = bounds;
    const dots: Dot[] = [];

    const maxAttempts = Math.max(2000, targetCount * 30);
    let attempts = 0;

    while (dots.length < targetCount && attempts < maxAttempts) {
      attempts += 1;
      const x = x0 + Math.random() * (x1 - x0);
      const y = y0 + Math.random() * (y1 - y0);
      const lngLat = projection.invert([x, y]);
      if (!lngLat) continue;
      if (d3.geoContains(feat as any, lngLat as any)) dots.push({ x, y });
    }

    setDotsByKey((prev) => ({ ...prev, [key]: dots }));
  };

  useEffect(() => {
    if (step !== "regions") return;
    for (const r of franceRegions) {
      const code = getCode(r);
      const key = `r:${code}`;
      if (dotsByKey[key]) continue;
      const area = geoPath.area(r as any);
      const target = Math.min(650, Math.max(140, Math.round(area / 2200)));
      setTimeout(() => generateDots(r as any, key, target), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, franceRegions]);

  useEffect(() => {
    if (step !== "departments") return;
    // Derive departments list inline to avoid temporal-dead-zone issues with hook ordering.
    const deps =
      selectedRegionCode === null
        ? []
        : franceDepartments.filter((d: any) => {
            const deptCode = normalizeDeptCode(getCode(d));
            if (!isMetropolitanDepartment(deptCode)) return false;
            const rc =
              getRegionCodeFromDept(d) || REGION_CODE_BY_DEPT[deptCode] || "";
            return rc ? rc === selectedRegionCode : false;
          });

    for (const d of deps) {
      const code = normalizeDeptCode(getCode(d));
      const key = `d:${code}`;
      if (dotsByKey[key]) continue;
      const area = geoPath.area(d as any);
      const target = Math.min(450, Math.max(90, Math.round(area / 2200)));
      setTimeout(() => generateDots(d as any, key, target), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedRegionCode, franceDepartments]);

  const handleBackToRegions = () => {
    setStep("regions");
    setSelectedRegionCode(null);
    setHoveredDept(null);
    setHoveredAppellation(null);
    setSelectedDeptCode(null);
  };
  const handleBackToDepartments = () => {
    setStep("departments");
    setHoveredAppellation(null);
    setSelectedDeptCode(null);
  };

  const departmentsForSelectedRegion = useMemo(() => {
    if (!selectedRegionCode) return [];
    return franceDepartments.filter((d: any) => {
      const deptCode = normalizeDeptCode(getCode(d));
      if (!isMetropolitanDepartment(deptCode)) return false;
      const rc =
        getRegionCodeFromDept(d) || REGION_CODE_BY_DEPT[deptCode] || "";
      return rc ? rc === selectedRegionCode : false;
    });
  }, [franceDepartments, selectedRegionCode]);

  const selectedDepartmentFeature = useMemo(() => {
    if (!selectedDeptCode) return null;
    return (
      departmentsForSelectedRegion.find(
        (d) => normalizeDeptCode(getCode(d)) === selectedDeptCode,
      ) || null
    );
  }, [departmentsForSelectedRegion, selectedDeptCode]);

  const appellationsForSelectedDepartment = useMemo(() => {
    if (!selectedDepartmentFeature) return [];
    // Filter by whether the appellation’s centroid lies within the selected department.
    // This keeps it purely geographic without requiring heavy polygon intersection.
    return franceAppellations.filter((a: any) => {
      try {
        const c = d3.geoCentroid(a as any) as [number, number];
        if (!c || Number.isNaN(c[0]) || Number.isNaN(c[1])) return false;
        return d3.geoContains(selectedDepartmentFeature as any, c as any);
      } catch {
        return false;
      }
    });
  }, [franceAppellations, selectedDepartmentFeature]);

  if (isLoading) {
    return (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="text-muted-foreground">Loading map…</div>
      </div>
    );
  }

  if (!regionsTopo || !departmentsTopo || !appellationsGeo) {
    return (
      <div className="relative flex items-center justify-center w-full h-full p-6">
        <div className="max-w-xl text-sm text-muted-foreground space-y-3">
          <div className="text-foreground font-semibold">
            France map data missing
          </div>
          {dataError && (
            <div className="text-xs text-foreground/70">
              <span className="font-medium">Details:</span> {dataError}
            </div>
          )}
          <div>
            Add these files into <code className="text-foreground">/public</code>{" "}
            of the main app:
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <code className="text-foreground">
                france_regions_metropolitan.json
              </code>
            </li>
            <li>
              <code className="text-foreground">
                france_departments_metropolitan.json
              </code>
            </li>
            <li>
              <code className="text-foreground">france_appellations.geojson</code>
            </li>
          </ul>
          <div className="text-xs">
            Departments must include a <code className="text-foreground">region_code</code>{" "}
            (or similar) property so we can filter by selected region.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-full bg-transparent"
        preserveAspectRatio="xMidYMid meet"
      >
        <AnimatePresence mode="wait">
          {step === "regions" && (
            <motion.g
              key="regions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {franceRegions.map((r: any, idx: number) => {
                const code = getCode(r) || String(idx);
                const isHovered = hoveredRegion === code;

                return (
                  <path
                    key={code}
                    d={geoPath(r as any) || ""}
                    fill="transparent"
                    stroke={isHovered ? "#888" : "#555"}
                    strokeWidth={isHovered ? 2 : 1.25}
                    opacity={isHovered ? 0.85 : 0.55}
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={() => setHoveredRegion(code)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRegionCode(code);
                      setStep("departments");
                    }}
                  />
                );
              })}

              {franceRegions.map((r: any, idx: number) => {
                const code = getCode(r) || String(idx);
                const key = `r:${code}`;
                const dots = dotsByKey[key] || [];
                const isHovered = hoveredRegion === code;
                const baseOpacity = isHovered ? 0.7 : 0.4;
                return (
                  <g key={key} style={{ pointerEvents: "none" }}>
                    {dots.map((dot, i) => {
                      const shouldAnimate = i % 9 === 0;
                      if (shouldAnimate) {
                        return (
                          <motion.circle
                            key={i}
                            cx={dot.x}
                            cy={dot.y}
                            r={1.2}
                            fill="currentColor"
                            initial={{ opacity: baseOpacity }}
                            animate={{
                              opacity: [baseOpacity, baseOpacity + 0.25, baseOpacity],
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 2.4,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                              delay: (i % 20) * 0.06,
                            }}
                          />
                        );
                      }
                      return (
                        <circle
                          key={i}
                          cx={dot.x}
                          cy={dot.y}
                          r={1.2}
                          fill="currentColor"
                          opacity={baseOpacity}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {hoveredRegion && (
                <text
                  x={WIDTH / 2}
                  y={90}
                  textAnchor="middle"
                  fill="currentColor"
                  style={{ fontFamily: "ui-monospace", fontSize: 14, opacity: 0.6 }}
                >
                  region: {getName(franceRegions.find((r) => getCode(r) === hoveredRegion) || { properties: { name: hoveredRegion } })}
                </text>
              )}
            </motion.g>
          )}

          {step === "departments" && (
            <motion.g
              key="departments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <rect
                x={0}
                y={0}
                width={WIDTH}
                height={HEIGHT}
                fill="transparent"
                onClick={handleBackToRegions}
                style={{ cursor: "zoom-out" }}
              />

              {departmentsForSelectedRegion.map((d: any, idx: number) => {
                const code = normalizeDeptCode(getCode(d) || String(idx));
                const isHovered = hoveredDept === code;

                return (
                  <path
                    key={code}
                    d={geoPath(d as any) || ""}
                    fill="transparent"
                    stroke={isHovered ? "#888" : "#555"}
                    strokeWidth={isHovered ? 2 : 1.15}
                    opacity={isHovered ? 0.85 : 0.55}
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={() => setHoveredDept(code)}
                    onMouseLeave={() => setHoveredDept(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDeptCode(code);
                      setHoveredAppellation(null);
                      setStep("appellations");
                    }}
                  />
                );
              })}

              {departmentsForSelectedRegion.map((d: any, idx: number) => {
                const code = normalizeDeptCode(getCode(d) || String(idx));
                const key = `d:${code}`;
                const dots = dotsByKey[key] || [];
                const isHovered = hoveredDept === code;
                const baseOpacity = isHovered ? 0.7 : 0.4;
                return (
                  <g key={key} style={{ pointerEvents: "none" }}>
                    {dots.map((dot, i) => {
                      const shouldAnimate = i % 10 === 0;
                      if (shouldAnimate) {
                        return (
                          <motion.circle
                            key={i}
                            cx={dot.x}
                            cy={dot.y}
                            r={1.15}
                            fill="currentColor"
                            initial={{ opacity: baseOpacity }}
                            animate={{
                              opacity: [baseOpacity, baseOpacity + 0.25, baseOpacity],
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 2.4,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                              delay: (i % 20) * 0.05,
                            }}
                          />
                        );
                      }
                      return (
                        <circle
                          key={i}
                          cx={dot.x}
                          cy={dot.y}
                          r={1.15}
                          fill="currentColor"
                          opacity={baseOpacity}
                        />
                      );
                    })}
                  </g>
                );
              })}

              <text
                x={WIDTH / 2}
                y={90}
                textAnchor="middle"
                fill="currentColor"
                style={{ fontFamily: "ui-monospace", fontSize: 14, opacity: 0.6 }}
              >
                {selectedRegionCode
                  ? `region ${selectedRegionCode} → departments → appellations`
                  : "departments"}
              </text>

              {hoveredDept && (
                <text
                  x={WIDTH / 2}
                  y={120}
                  textAnchor="middle"
                  fill="currentColor"
                  style={{ fontFamily: "ui-monospace", fontSize: 12, opacity: 0.55 }}
                >
                  dept: {getName(departmentsForSelectedRegion.find((d) => normalizeDeptCode(getCode(d)) === hoveredDept) || { properties: { name: hoveredDept } })}
                </text>
              )}
            </motion.g>
          )}

          {step === "appellations" && (
            <motion.g
              key="appellations"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <rect
                x={0}
                y={0}
                width={WIDTH}
                height={HEIGHT}
                fill="transparent"
                onClick={handleBackToDepartments}
                style={{ cursor: "zoom-out" }}
              />

              {(selectedDepartmentFeature ? [selectedDepartmentFeature] : []).map(
                (d: any) => (
                  <path
                    key={`dept-outline:${selectedDeptCode || "selected"}`}
                    d={geoPath(d as any) || ""}
                    fill="transparent"
                    stroke="#777"
                    strokeWidth={1.75}
                    opacity={0.35}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              )}

              {appellationsForSelectedDepartment.map((a: any, idx: number) => {
                const key = `${getName(a)}:${idx}`;
                const isHovered = hoveredAppellation === key;
                return (
                  <path
                    key={key}
                    d={geoPath(a as any) || ""}
                    fill="transparent"
                    stroke={isHovered ? "#999" : "#555"}
                    strokeWidth={isHovered ? 2 : 1.1}
                    opacity={isHovered ? 0.9 : 0.55}
                    style={{ cursor: "default", transition: "all 0.2s ease" }}
                    onMouseEnter={() => setHoveredAppellation(key)}
                    onMouseLeave={() => setHoveredAppellation(null)}
                  />
                );
              })}

              <text
                x={WIDTH / 2}
                y={90}
                textAnchor="middle"
                fill="currentColor"
                style={{ fontFamily: "ui-monospace", fontSize: 14, opacity: 0.6 }}
              >
                {selectedDeptCode ? `dept ${selectedDeptCode} → appellations` : "appellations"}
              </text>

              {hoveredAppellation && (
                <text
                  x={WIDTH / 2}
                  y={120}
                  textAnchor="middle"
                  fill="currentColor"
                  style={{ fontFamily: "ui-monospace", fontSize: 12, opacity: 0.55 }}
                >
                  appellation:{" "}
                  {(() => {
                    const [name] = hoveredAppellation.split(":");
                    return name || hoveredAppellation;
                  })()}
                </text>
              )}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

