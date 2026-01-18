"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as d3 from "d3";

interface ProducerNode {
  id: string;
  name: string;
  bottles: number;
  region?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface PalletNode {
  id: string;
  name: string;
  currentBottles: number;
  capacity: number;
  percentage: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | ProducerNode | PalletNode;
  target: string | ProducerNode | PalletNode;
  bottles: number;
}

interface NetworkData {
  pallet: PalletNode;
  producers: ProducerNode[];
}

interface LivingPalletVisualizationProps {
  palletId?: string | null;
}

export function LivingPalletVisualization({ palletId = null }: LivingPalletVisualizationProps = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<NetworkData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  // Fetch network data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (palletId) {
          // Get specific pallet data
          const palletResponse = await fetch(
            `/api/admin/pallets/network-data?palletId=${palletId}`
          );
          if (palletResponse.ok) {
            const palletData = await palletResponse.json();
            setData(palletData);
          } else {
            setData(getMockData());
          }
        } else {
          // Get first active pallet
          const response = await fetch("/api/admin/pallets/network-data");
          if (response.ok) {
            const result = await response.json();
            if (result.pallets && result.pallets.length > 0) {
              // Get detailed data for first pallet
              const palletResponse = await fetch(
                `/api/admin/pallets/network-data?palletId=${result.pallets[0].id}`
              );
              if (palletResponse.ok) {
                const palletData = await palletResponse.json();
                setData(palletData);
              } else {
                // Use mock data if no real data
                setData(getMockData());
              }
            } else {
              // Use mock data if no pallets
              setData(getMockData());
            }
          } else {
            // Use mock data on error
            setData(getMockData());
          }
        }
      } catch (error) {
        console.error("Error fetching network data:", error);
        setData(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [palletId]);

  // Initialize D3 force simulation
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    svg.selectAll("*").remove();

    // Create nodes array with proper typing
    const palletNode: PalletNode = {
      ...data.pallet,
      x: width / 2,
      y: height / 2,
    };
    const producerNodes: ProducerNode[] = data.producers.map((p) => ({
      ...p,
    }));
    const nodes: (ProducerNode | PalletNode)[] = [palletNode, ...producerNodes];

    // Create links with proper typing - store bottles in a map for easy lookup
    const linkBottlesMap = new Map<string, number>();
    const links: Link[] = data.producers.map((producer) => {
      const linkKey = `${producer.id}-${data.pallet.id}`;
      linkBottlesMap.set(linkKey, producer.bottles);
      return {
        source: producer.id as string,
        target: data.pallet.id as string,
        bottles: producer.bottles,
      };
    });

    // Create force simulation
    const simulation = d3
      .forceSimulation<ProducerNode | PalletNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<ProducerNode | PalletNode, d3.SimulationLinkDatum<ProducerNode | PalletNode>>(links)
          .id((d) => d.id)
          .distance((d) => {
            // Distance based on bottles (more bottles = closer)
            const sourceId = typeof d.source === "string" ? d.source : d.source.id;
            const targetId = typeof d.target === "string" ? d.target : d.target.id;
            const linkKey = `${sourceId}-${targetId}`;
            const bottles = linkBottlesMap.get(linkKey) || 0;
            return 150 - (bottles / 10);
          })
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<ProducerNode | PalletNode>().radius((d) => {
          if (d.id === data.pallet.id) return 60;
          return 30;
        })
      );

    // Fix pallet in center
    nodes[0].fx = width / 2;
    nodes[0].fy = height / 2;

    simulationRef.current = simulation;

    // Get the link force to access its links
    const linkForce = simulation.force<d3.ForceLink<ProducerNode | PalletNode, d3.SimulationLinkDatum<ProducerNode | PalletNode>>>("link");
    const simulationLinks = linkForce?.links() || [];

    // Create links
    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, d3.SimulationLinkDatum<ProducerNode | PalletNode>>("line")
      .data(simulationLinks)
      .enter()
      .append("line")
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", (d) => {
        const sourceId = typeof d.source === "string" ? d.source : d.source.id;
        const targetId = typeof d.target === "string" ? d.target : d.target.id;
        const linkKey = `${sourceId}-${targetId}`;
        const bottles = linkBottlesMap.get(linkKey) || 0;
        return Math.max(1, Math.min(4, bottles / 30));
      });

    // Create nodes
    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag<SVGGElement, ProducerNode | PalletNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("mouseenter", function (event, d: any) {
        setHoveredNode(d.id);
        d3.select(this).raise();
      })
      .on("mouseleave", function () {
        setHoveredNode(null);
      })
      .on("click", function (event, d) {
        if (d.id !== data.pallet.id) {
          setSelectedProducer(d.id);
        }
      });

    // Add circles for nodes
    node
      .append("circle")
      .attr("r", (d) => {
        if (d.id === data.pallet.id) {
          // Pallet size based on percentage
          const pallet = d as PalletNode;
          return 40 + (pallet.percentage / 100) * 20;
        }
        const producer = d as ProducerNode;
        return 20 + (producer.bottles / 200) * 15;
      })
      .attr("fill", (d) => {
        if (d.id === data.pallet.id) return "#000";
        return hoveredNode === d.id ? "#333" : "#666";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .transition()
      .duration(300)
      .attr("fill", (d) => {
        if (d.id === data.pallet.id) return "#000";
        if (hoveredNode === d.id) return "#000";
        if (selectedProducer === d.id) return "#000";
        return "#666";
      });

    // Add labels
    const label = node
      .append("text")
      .attr("dx", 0)
      .attr("dy", (d: any) => {
        if (d.id === data.pallet.id) return 50;
        return 30;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.id === data.pallet.id ? "12" : "10"))
      .attr("font-weight", (d) => (d.id === data.pallet.id ? "600" : "400"))
      .attr("fill", "#000")
      .text((d) => {
        if (d.id === data.pallet.id) {
          const pallet = d as PalletNode;
          return `${pallet.name}\n${pallet.currentBottles}/${pallet.capacity} (${Math.round(pallet.percentage)}%)`;
        }
        return d.name;
      })
      .style("pointer-events", "none")
      .style("opacity", 0)
      .transition()
      .duration(300)
      .style("opacity", 1);

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => {
          const source = d.source as ProducerNode | PalletNode;
          return source.x ?? 0;
        })
        .attr("y1", (d) => {
          const source = d.source as ProducerNode | PalletNode;
          return source.y ?? 0;
        })
        .attr("x2", (d) => {
          const target = d.target as ProducerNode | PalletNode;
          return target.x ?? 0;
        })
        .attr("y2", (d) => {
          const target = d.target as ProducerNode | PalletNode;
          return target.y ?? 0;
        });

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Drag functions
    function dragstarted(
      event: d3.D3DragEvent<SVGGElement, ProducerNode | PalletNode, ProducerNode | PalletNode>,
      d: ProducerNode | PalletNode
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x || 0;
      d.fy = d.y || 0;
    }

    function dragged(
      event: d3.D3DragEvent<SVGGElement, ProducerNode | PalletNode, ProducerNode | PalletNode>,
      d: ProducerNode | PalletNode
    ) {
      if (d.id !== data.pallet.id) {
        d.fx = event.x;
        d.fy = event.y;
      }
    }

    function dragended(
      event: d3.D3DragEvent<SVGGElement, ProducerNode | PalletNode, ProducerNode | PalletNode>,
      d: ProducerNode | PalletNode
    ) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.id !== data.pallet.id) {
        d.fx = null;
        d.fy = null;
      }
    }

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data, hoveredNode, selectedProducer]);

  const getMockData = (): NetworkData => {
    return {
      pallet: {
        id: "pallet-1",
        name: "Languedoc Early November",
        currentBottles: 487,
        capacity: 700,
        percentage: 69.6,
      },
      producers: [
        {
          id: "producer-1",
          name: "Domaine de la Clape",
          bottles: 120,
          region: "Languedoc",
        },
        {
          id: "producer-2",
          name: "Le Bouc à Trois Pattes",
          bottles: 95,
          region: "Languedoc",
        },
        {
          id: "producer-3",
          name: "Mas de la Seranne",
          bottles: 150,
          region: "Languedoc",
        },
        {
          id: "producer-4",
          name: "Domaine de l'Aigle",
          bottles: 122,
          region: "Languedoc",
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] bg-muted/30 rounded-2xl flex items-center justify-center border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar nätverk...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-[600px] bg-muted/30 rounded-2xl flex items-center justify-center border border-border">
        <p className="text-sm text-muted-foreground">Ingen data tillgänglig</p>
      </div>
    );
  }

  const selectedProducerData = data.producers.find(
    (p) => p.id === selectedProducer
  );

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full min-h-[600px] bg-muted/30 rounded-2xl overflow-hidden border border-border">
        <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0" />
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-4 left-4 bg-background border border-border rounded-lg p-4 shadow-lg z-10 max-w-xs"
          >
            {hoveredNode === data.pallet.id ? (
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {data.pallet.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {data.pallet.currentBottles} / {data.pallet.capacity} flaskor
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(data.pallet.percentage)}% full
                </p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.pallet.percentage}%` }}
                    className="h-full bg-foreground"
                  />
                </div>
              </div>
            ) : (
              (() => {
                const producer = data.producers.find((p) => p.id === hoveredNode);
                return producer ? (
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {producer.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {producer.bottles} flaskor reserverade
                    </p>
                    {producer.region && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {producer.region}
                      </p>
                    )}
                  </div>
                ) : null;
              })()
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Producer Detail */}
      <AnimatePresence>
        {selectedProducerData && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-4 left-4 right-4 bg-background border border-border rounded-lg p-6 shadow-lg z-10"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {selectedProducerData.name}
                </h3>
                {selectedProducerData.region && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProducerData.region}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedProducer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Reserverade flaskor
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedProducerData.bottles}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Bidrag till pall
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round(
                    (selectedProducerData.bottles / data.pallet.currentBottles) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <a
                href={`/shop/${selectedProducerData.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm text-foreground hover:underline"
              >
                Se viner från denna producent →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 text-xs text-muted-foreground max-w-xs">
        <p className="mb-1 font-medium text-foreground">Interaktiva instruktioner:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Hovra över noder för detaljer</li>
          <li>Klicka på producenter för mer info</li>
          <li>Dra producenter för att flytta dem</li>
          <li>Pallen är fixerad i mitten</li>
        </ul>
      </div>
    </div>
  );
}

