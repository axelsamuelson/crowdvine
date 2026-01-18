"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";

interface Producer {
  id: string;
  name: string;
  region: string;
  reservedBottles: number;
  x: number;
  y: number;
  z: number;
}

interface PalletCluster {
  id: string;
  name: string;
  producers: Producer[];
  x: number;
  y: number;
  z: number;
}

// Producer Star Component
function ProducerStar({
  producer,
  onClick,
  isHovered,
  onHover,
}: {
  producer: Producer;
  onClick: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = Math.max(0.3, Math.min(1.5, 0.3 + producer.reservedBottles / 200));

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y += 0.01;
      // Pulse effect
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1;
      meshRef.current.scale.setScalar(size * pulse);
    }
  });

  return (
    <group position={[producer.x, producer.y, producer.z]}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={isHovered ? "#ffffff" : producer.reservedBottles > 0 ? "#cccccc" : "#666666"}
          emissive={isHovered ? "#ffffff" : producer.reservedBottles > 0 ? "#888888" : "#333333"}
          emissiveIntensity={isHovered ? 0.5 : producer.reservedBottles > 0 ? 0.2 : 0.1}
        />
      </mesh>
      {isHovered && (
        <Text
          position={[0, size + 0.5, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {producer.name}
        </Text>
      )}
    </group>
  );
}

// Pallet Cluster Component
function PalletCluster({ cluster }: { cluster: PalletCluster }) {
  return (
    <group position={[cluster.x, cluster.y, cluster.z]}>
      {/* Cluster center */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#000000"
          emissiveIntensity={0.3}
          transparent
          opacity={0.5}
        />
      </mesh>
      {/* Producer stars in cluster */}
      {cluster.producers.map((producer) => (
        <ProducerStar
          key={producer.id}
          producer={producer}
          onClick={() => {}}
          isHovered={false}
          onHover={() => {}}
        />
      ))}
    </group>
  );
}

// Main Scene Component
function GalaxyScene({
  producers,
  selectedProducer,
  onProducerClick,
  hoveredProducer,
  onProducerHover,
}: {
  producers: Producer[];
  selectedProducer: string | null;
  onProducerClick: (id: string) => void;
  hoveredProducer: string | null;
  onProducerHover: (id: string | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Background stars */}
      <Stars radius={50} depth={50} count={1000} factor={2} />

      {/* Producer stars */}
      {producers.map((producer) => (
        <ProducerStar
          key={producer.id}
          producer={producer}
          onClick={() => onProducerClick(producer.id)}
          isHovered={hoveredProducer === producer.id}
          onHover={(hovered) => onProducerHover(hovered ? producer.id : null)}
        />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
      />
    </>
  );
}

export function WineGalaxyVisualization() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProducer, setHoveredProducer] = useState<string | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/producers/map-data");
        if (response.ok) {
          const result = await response.json();
          if (result.producers && result.producers.length > 0) {
            // Convert producers to 3D positions in a galaxy-like distribution
            const producers3D = result.producers.map((p: any, index: number) => {
              // Create spiral galaxy distribution
              const angle = (index / result.producers.length) * Math.PI * 2;
              const radius = 5 + (index % 3) * 2;
              const height = (Math.random() - 0.5) * 4;

              return {
                id: p.id,
                name: p.name,
                region: p.region || "Unknown",
                reservedBottles: p.reservedBottles || 0,
                x: Math.cos(angle) * radius,
                y: height,
                z: Math.sin(angle) * radius,
              };
            });
            setProducers(producers3D);
          } else {
            setProducers(getMockProducers());
          }
        } else {
          setProducers(getMockProducers());
        }
      } catch (error) {
        console.error("Error fetching producer data:", error);
        setProducers(getMockProducers());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getMockProducers = (): Producer[] => {
    const mockProducers = [
      { id: "1", name: "Domaine de la Clape", region: "Languedoc", reservedBottles: 120 },
      { id: "2", name: "Le Bouc à Trois Pattes", region: "Languedoc", reservedBottles: 95 },
      { id: "3", name: "Mas de la Seranne", region: "Languedoc", reservedBottles: 150 },
      { id: "4", name: "Domaine de l'Aigle", region: "Languedoc", reservedBottles: 122 },
      { id: "5", name: "Domaine Roussillon", region: "Roussillon", reservedBottles: 87 },
    ];

    return mockProducers.map((p, index) => {
      const angle = (index / mockProducers.length) * Math.PI * 2;
      const radius = 5 + (index % 3) * 2;
      const height = (Math.random() - 0.5) * 4;

      return {
        ...p,
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius,
      };
    });
  };

  const selectedProducerData = producers.find((p) => p.id === selectedProducer);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-muted/30 rounded-2xl border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar galax...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[600px]">
      <div className="w-full h-full bg-muted/30 rounded-2xl border border-border overflow-hidden">
        <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
          <GalaxyScene
            producers={producers}
            selectedProducer={selectedProducer}
            onProducerClick={setSelectedProducer}
            hoveredProducer={hoveredProducer}
            onProducerHover={setHoveredProducer}
          />
        </Canvas>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 text-xs">
        <p className="font-medium text-foreground mb-2">Kontroller:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Dra för att rotera</li>
          <li>• Scrolla för att zooma</li>
          <li>• Hovra över stjärnor</li>
          <li>• Klicka för att se detaljer</li>
        </ul>
      </div>

      {/* Selected Producer Info */}
      <AnimatePresence>
        {selectedProducerData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {selectedProducerData.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProducerData.region}
                </p>
              </div>
              <button
                onClick={() => setSelectedProducer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Reserverade flaskor
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedProducerData.reservedBottles}
                </span>
              </div>
            </div>
            <a
              href={`/shop/${selectedProducerData.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm text-foreground hover:underline inline-block"
            >
              Se viner från denna producent →
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredProducer && !selectedProducer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 text-xs"
          >
            <p className="font-medium text-foreground">
              {producers.find((p) => p.id === hoveredProducer)?.name}
            </p>
            <p className="text-muted-foreground">
              {producers.find((p) => p.id === hoveredProducer)?.reservedBottles || 0} flaskor
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

