"use client"

import * as d3 from "d3"
import { AnimatePresence, motion } from "framer-motion"
import { feature } from "topojson-client"
import { useEffect, useMemo, useState } from "react"

interface GeoFeature {
  type: string
  id?: string
  geometry: any
  properties: any
}

const WIDTH = 1000
const HEIGHT = 1100

// ISO-3166 numeric for France in world-atlas datasets
const FRANCE_COUNTRY_ID = "250"

const METROPOLITAN_REGION_CODES = new Set([
  "11",
  "24",
  "27",
  "28",
  "32",
  "44",
  "52",
  "53",
  "75",
  "76",
  "84",
  "93",
  "94",
])

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
}

function getCode(f: any): string {
  return (
    String(f?.id ?? "").trim() ||
    String(f?.properties?.code ?? "").trim() ||
    String(f?.properties?.CODE ?? "").trim() ||
    String(f?.properties?.insee ?? "").trim()
  )
}

function getName(f: any): string {
  return (
    String(f?.properties?.name ?? "").trim() ||
    String(f?.properties?.nom ?? "").trim() ||
    String(f?.properties?.NOM ?? "").trim() ||
    String(f?.properties?.libelle ?? "").trim() ||
    getCode(f)
  )
}

function getRegionCodeFromDept(f: any): string {
  return (
    String(f?.properties?.region_code ?? "").trim() ||
    String(f?.properties?.REGION ?? "").trim() ||
    String(f?.properties?.code_region ?? "").trim() ||
    ""
  )
}

function normalizeDeptCode(raw: string) {
  const v = String(raw || "").trim().toUpperCase()
  if (v === "2A" || v === "2B") return v
  if (/^\d+$/.test(v)) return v.padStart(2, "0")
  return v
}

function isMetropolitanRegion(regionCode: string) {
  return METROPOLITAN_REGION_CODES.has(String(regionCode || "").trim())
}

// Keep metropolitan France only (exclude overseas by default).
// This is intentionally conservative: it filters out common overseas department codes.
function isMetropolitanDepartment(deptCode: string) {
  const c = deptCode.toUpperCase()
  // Overseas: 971-976, 986-988, 984, 2A/2B are Corsica (keep)
  if (["971", "972", "973", "974", "975", "976", "984", "986", "987", "988"].includes(c)) return false
  return true
}

function toFeatures(data: any): GeoFeature[] {
  if (!data) return []
  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    return data.features as GeoFeature[]
  }
  if (data.type === "Topology") {
    const obj =
      (data as any).objects?.france ||
      (data as any).objects?.regions ||
      (data as any).objects?.departments ||
      Object.values((data as any).objects || {})[0]
    if (!obj) return []
    return (feature(data as any, obj as any).features as GeoFeature[]) || []
  }
  return []
}

export function FranceMap() {
  const [regionsTopo, setRegionsTopo] = useState<any>(null)
  const [departmentsTopo, setDepartmentsTopo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Steps:
  // 1) regions view (metropolitan France regions)
  // 2) departments view (filtered by selected region)
  const [step, setStep] = useState<"regions" | "departments">("regions")
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [hoveredDept, setHoveredDept] = useState<string | null>(null)
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setDataError(null)
        const fetchJson = async (path: string) => {
          const res = await fetch(path)
          const contentType = res.headers.get("content-type") || ""
          if (!res.ok) {
            const text = await res.text().catch(() => "")
            return { ok: false as const, error: `${path} returned ${res.status}. Body starts with: ${text.slice(0, 30)}`, data: null }
          }
          if (!contentType.includes("application/json") && !contentType.includes("application/topo+json")) {
            const text = await res.text().catch(() => "")
            return { ok: false as const, error: `${path} is not JSON (content-type=${contentType}). Body starts with: ${text.slice(0, 30)}`, data: null }
          }
          return { ok: true as const, data: await res.json(), error: null }
        }

        const [regionsR, deptsR] = await Promise.all([
          fetchJson("/france_regions_metropolitan.json"),
          fetchJson("/france_departments_metropolitan.json"),
        ])

        if (!regionsR.ok) setDataError((prev) => prev || regionsR.error)
        if (!deptsR.ok) setDataError((prev) => prev || deptsR.error)

        setRegionsTopo(regionsR.ok ? regionsR.data : null)
        setDepartmentsTopo(deptsR.ok ? deptsR.data : null)
      } catch (e) {
        setDataError(String((e as any)?.message || e))
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const franceRegions = useMemo(() => {
    const feats = toFeatures(regionsTopo)
    return feats.filter((r: any) => isMetropolitanRegion(getCode(r)))
  }, [regionsTopo])

  const franceDepartments = useMemo(() => {
    const feats = toFeatures(departmentsTopo)
    return feats.filter((d: any) => isMetropolitanDepartment(normalizeDeptCode(getCode(d))))
  }, [departmentsTopo])

  const projection = useMemo(() => {
    // Tuned for metropolitan France in this 1000x1100 viewBox
    return d3.geoMercator().scale(2800).center([2.2, 46.4]).translate([WIDTH / 2, HEIGHT / 2])
  }, [])

  const geoPath = useMemo(() => d3.geoPath().projection(projection), [projection])

  const handleBackToRegions = () => {
    setStep("regions")
    setSelectedRegionCode(null)
    setHoveredDept(null)
  }

  const departmentsForSelectedRegion = useMemo(() => {
    if (!selectedRegionCode) return []
    return franceDepartments.filter((d: any) => {
      const deptCode = normalizeDeptCode(getCode(d))
      if (!isMetropolitanDepartment(deptCode)) return false
      const rc = getRegionCodeFromDept(d) || REGION_CODE_BY_DEPT[deptCode] || ""
      return rc ? rc === selectedRegionCode : false
    })
  }, [franceDepartments, selectedRegionCode])

  if (isLoading) {
    return (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="text-muted-foreground">Loading map…</div>
      </div>
    )
  }

  // If the france topojson files aren't present yet, guide the user.
  if (!regionsTopo || !departmentsTopo) {
    return (
      <div className="relative flex items-center justify-center w-full h-full p-6">
        <div className="max-w-xl text-sm text-muted-foreground space-y-3">
          <div className="text-foreground font-semibold">France map data missing</div>
          {dataError && (
            <div className="text-xs text-foreground/70">
              <span className="font-medium">Details:</span> {dataError}
            </div>
          )}
          <div>
            Add these files into <code className="text-foreground">/public</code> of this demo project:
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <code className="text-foreground">france_regions_metropolitan.json</code> (TopoJSON)
            </li>
            <li>
              <code className="text-foreground">france_departments_metropolitan.json</code> (TopoJSON)
            </li>
          </ul>
          <div className="text-xs">
            Note: departments must include a <code className="text-foreground">region_code</code> (or similar) property so
            we can filter departments by selected region.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full bg-transparent" preserveAspectRatio="xMidYMid meet">
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
                const code = getCode(r) || String(idx)
                const name = getName(r)
                const isHovered = hoveredRegion === code

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
                      e.stopPropagation()
                      setSelectedRegionCode(code)
                      setStep("departments")
                    }}
                  />
                )
              })}

              {/* label */}
              {hoveredRegion && (
                <text x={WIDTH / 2} y={90} textAnchor="middle" className="fill-foreground" style={{ fontFamily: "ui-monospace", fontSize: 14, opacity: 0.75 }}>
                  region: {hoveredRegion}
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
              <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="transparent" onClick={handleBackToRegions} style={{ cursor: "zoom-out" }} />

              {departmentsForSelectedRegion.map((d: any, idx: number) => {
                const code = getCode(d) || String(idx)
                const name = getName(d)
                const isHovered = hoveredDept === code

                return (
                  <path
                    key={code}
                    d={geoPath(d as any) || ""}
                    fill="transparent"
                    stroke={isHovered ? "#888" : "#555"}
                    strokeWidth={isHovered ? 2 : 1.15}
                    opacity={isHovered ? 0.85 : 0.55}
                    style={{ cursor: "default", transition: "all 0.2s ease" }}
                    onMouseEnter={() => setHoveredDept(code)}
                    onMouseLeave={() => setHoveredDept(null)}
                  />
                )
              })}

              <text x={WIDTH / 2} y={90} textAnchor="middle" className="fill-foreground" style={{ fontFamily: "ui-monospace", fontSize: 14, opacity: 0.75 }}>
                {selectedRegionCode ? `region ${selectedRegionCode} → departments` : "departments"}
              </text>

              {hoveredDept && (
                <text x={WIDTH / 2} y={120} textAnchor="middle" className="fill-foreground" style={{ fontFamily: "ui-monospace", fontSize: 12, opacity: 0.7 }}>
                  dept: {hoveredDept}
                </text>
              )}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  )
}

export default FranceMap

