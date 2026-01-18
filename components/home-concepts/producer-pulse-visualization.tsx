"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import * as d3 from "d3";

interface ProducerNode {
  id: string;
  name: string;
  region: string;
  reservedBottles: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | ProducerNode;
  target: string | ProducerNode;
  palletId: string;
  palletName: string;
}

export function ProducerPulseVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [producers, setProducers] = useState<ProducerNode[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get producers with reservations
        const producersResponse = await fetch("/api/admin/producers/map-data");
        if (producersResponse.ok) {
          const producersData = await producersResponse.json();
          if (producersData.producers && producersData.producers.length > 0) {
            setProducers(producersData.producers);
          } else {
            setProducers(getMockProducers());
          }
        } else {
          setProducers(getMockProducers());
        }

        // Get pallets to create links between producers in same pallet
        const palletsResponse = await fetch("/api/admin/pallets/network-data");
        if (palletsResponse.ok) {
          const palletsData = await palletsResponse.json();
          if (palletsData.pallets && palletsData.pallets.length > 0) {
            // Get detailed data for first pallet to see which producers are connected
            const palletDetailResponse = await fetch(
              `/api/admin/pallets/network-data?palletId=${palletsData.pallets[0].id}`
            );
            if (palletDetailResponse.ok) {
              const palletDetail = await palletDetailResponse.json();
              // Create links between all producers in the same pallet
              const producerIds = palletDetail.producers.map((p: any) => p.id);
              const newLinks: Link[] = [];
              for (let i = 0; i < producerIds.length; i++) {
                for (let j = i + 1; j < producerIds.length; j++) {
                  newLinks.push({
                    source: producerIds[i],
                    target: producerIds[j],
                    palletId: palletDetail.pallet.id,
                    palletName: palletDetail.pallet.name,
                  });
                }
              }
              setLinks(newLinks);
            } else {
              setLinks(getMockLinks());
            }
          } else {
            setLinks(getMockLinks());
          }
        } else {
          setLinks(getMockLinks());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setProducers(getMockProducers());
        setLinks(getMockLinks());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMockProducers = (): ProducerNode[] => {
    return [
      {
        id: "1",
        name: "Domaine de la Clape",
        region: "Languedoc",
        reservedBottles: 120,
      },
      {
        id: "2",
        name: "Le Bouc à Trois Pattes",
        region: "Languedoc",
        reservedBottles: 95,
      },
      {
        id: "3",
        name: "Mas de la Seranne",
        region: "Languedoc",
        reservedBottles: 150,
      },
      {
        id: "4",
        name: "Domaine de l'Aigle",
        region: "Languedoc",
        reservedBottles: 122,
      },
      {
        id: "5",
        name: "Domaine Roussillon",
        region: "Roussillon",
        reservedBottles: 87,
      },
    ];
  };

  const getMockLinks = (): Link[] => {
    return [
      { source: "1", target: "2", palletId: "pallet-1", palletName: "Languedoc Pall" },
      { source: "1", target: "3", palletId: "pallet-1", palletName: "Languedoc Pall" },
      { source: "2", target: "3", palletId: "pallet-1", palletName: "Languedoc Pall" },
      { source: "3", target: "4", palletId: "pallet-1", palletName: "Languedoc Pall" },
      { source: "4", target: "5", palletId: "pallet-2", palletName: "Mixed Pallet" },
    ];
  };

  // Initialize D3 force simulation
  useEffect(() => {
    if (!producers.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    svg.selectAll("*").remove();

    // Create nodes array
    const nodes: ProducerNode[] = producers.map((p) => ({
      ...p,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    // Create linkBottlesMap for link width
    const linkBottlesMap = new Map<string, number>();
    const d3Links = links.map((link) => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;
      const linkKey = `${sourceId}-${targetId}`;
      // Calculate link strength based on producers' bottles
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);
      const bottles = (sourceNode?.reservedBottles || 0) + (targetNode?.reservedBottles || 0);
      linkBottlesMap.set(linkKey, bottles);
      return {
        source: sourceId,
        target: targetId,
        bottles,
      };
    });

    // Create force simulation
    const simulation = d3
      .forceSimulation<ProducerNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<ProducerNode, d3.SimulationLinkDatum<ProducerNode>>(d3Links)
          .id((d) => d.id)
          .distance(150)
          .strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<ProducerNode>().radius((d) => {
          const size = getNodeSize(d.reservedBottles);
          return size + 10;
        })
      );

    simulationRef.current = simulation;

    // Get the link force to access its links
    const linkForce = simulation.force<d3.ForceLink<ProducerNode, d3.SimulationLinkDatum<ProducerNode>>>("link");
    const simulationLinks = linkForce?.links() || [];

    // Create links
    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, d3.SimulationLinkDatum<ProducerNode>>("line")
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
        return Math.max(1, Math.min(4, 1 + (bottles / 200) * 3));
      });

    // Create nodes
    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, ProducerNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .on("mouseenter", function (event, d) {
        setHoveredNode(d.id);
        d3.select(this).raise();
      })
      .on("mouseleave", function () {
        setHoveredNode(null);
      });

    // Add pulsing circles for nodes
    node.each(function (d) {
      const g = d3.select(this);
      const size = getNodeSize(d.reservedBottles);
      const pulseSpeed = getPulseSpeed(d.reservedBottles);

      // Outer pulse ring
      if (d.reservedBottles > 0) {
        g.append("circle")
          .attr("r", size)
          .attr("fill", "none")
          .attr("stroke", d.reservedBottles > 100 ? "#000" : "#666")
          .attr("stroke-width", 1)
          .attr("opacity", 0.3)
          .transition()
          .duration(pulseSpeed * 1000)
          .ease(d3.easeSinInOut)
          .attr("r", size * 2)
          .attr("opacity", 0)
          .on("end", function repeat() {
            d3.select(this)
              .attr("r", size)
              .attr("opacity", 0.3)
              .transition()
              .duration(pulseSpeed * 1000)
              .ease(d3.easeSinInOut)
              .attr("r", size * 2)
              .attr("opacity", 0)
              .on("end", repeat);
          });
      }

      // Main node circle
      g.append("circle")
        .attr("r", size)
        .attr("fill", (d) => {
          if (hoveredNode === d.id) return "#000";
          return d.reservedBottles > 0 ? "#333" : "#666";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .data([d])
        .attr("data-node-id", (d) => d.id);
    });

    // Add labels
    const label = node
      .append("text")
      .attr("dx", 0)
      .attr("dy", (d) => getNodeSize(d.reservedBottles) + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "10")
      .attr("font-weight", "400")
      .attr("fill", "#000")
      .text((d) => d.name)
      .style("pointer-events", "none")
      .style("opacity", (d) => (hoveredNode === d.id ? 1 : 0.6));

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => {
          const source = d.source as ProducerNode;
          return source.x ?? 0;
        })
        .attr("y1", (d) => {
          const source = d.source as ProducerNode;
          return source.y ?? 0;
        })
        .attr("x2", (d) => {
          const target = d.target as ProducerNode;
          return target.x ?? 0;
        })
        .attr("y2", (d) => {
          const target = d.target as ProducerNode;
          return target.y ?? 0;
        });

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [producers, links, hoveredNode]);

  const getNodeSize = (bottles: number) => {
    if (bottles === 0) return 15;
    if (bottles < 50) return 20;
    if (bottles < 100) return 25;
    if (bottles < 150) return 30;
    return 35;
  };

  const getPulseSpeed = (bottles: number) => {
    if (bottles === 0) return 3;
    if (bottles < 50) return 2.5;
    if (bottles < 100) return 2;
    if (bottles < 150) return 1.5;
    return 1;
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-muted/30 rounded-2xl border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar nätverk...</p>
        </div>
      </div>
    );
  }

  const hoveredProducer = producers.find((p) => p.id === hoveredNode);

  return (
    <div className="relative w-full h-full min-h-[600px]">
      <div className="w-full h-full bg-muted/30 rounded-2xl border border-border overflow-hidden">
        <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0" />
      </div>


      {/* Tooltip */}
      {hoveredProducer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 bg-background border border-border rounded-lg p-4 shadow-lg z-10 max-w-xs"
        >
          <h3 className="font-semibold text-foreground mb-1">
            {hoveredProducer.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            {hoveredProducer.region}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Reserverade flaskor
              </span>
              <span className="text-xs font-semibold text-foreground">
                {hoveredProducer.reservedBottles}
              </span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Pulserar med tempoväxling baserat på aktivitet
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 text-xs">
        <p className="font-medium text-foreground mb-2">Ekosystem:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Noder pulserar med aktivitet</li>
          <li>• Trådar = samma pall</li>
          <li>• Hovra för detaljer</li>
        </ul>
      </div>
    </div>
  );
}

