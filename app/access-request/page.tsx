"use client";

import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormAccessRequest } from "@/components/form-access-request";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, Cross1Icon, LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import { inputVariants } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Background } from "@/components/background";

const DURATION = 0.3;
const DELAY = DURATION;
const EASE_OUT = "easeOut";
const EASE_OUT_OPACITY = [0.25, 0.46, 0.45, 0.94] as const;
const SPRING = {
  type: "spring" as const,
  stiffness: 60,
  damping: 10,
  mass: 0.8,
};

export default function AccessRequestPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const router = useRouter();

  const isInitialRender = useRef(true);

  useEffect(() => {
    return () => {
      isInitialRender.current = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    // Redirect to main app after successful unlock
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <>
      <div className="p-inset h-[100dvh] w-full">
        <div className="relative h-full w-full">
          <Background 
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/alt-g7Cv2QzqL3k6ey3igjNYkM32d8Fld7.mp4" 
            placeholder="/alt-placeholder.png" 
          />
          <div className="flex overflow-hidden relative flex-col gap-4 justify-center items-center w-full h-full max-w-4xl z-10">
            <motion.div
              layout="position"
              transition={{ duration: DURATION, ease: EASE_OUT }}
            >
              <h1 className="font-serif text-5xl italic sm:text-8xl lg:text-9xl text-white text-center">
                CrowdVine®
              </h1>
            </motion.div>

            <div className="flex flex-col items-center min-h-0 shrink">
          <AnimatePresence mode="popLayout" propagate>
            {!isOpen && (
              <motion.div
                key="access-form"
                initial={isInitialRender.current ? false : "hidden"}
                animate="visible"
                exit="exit"
                variants={{
                  visible: {
                    scale: 1,
                    transition: {
                      delay: DELAY,
                      duration: DURATION,
                      ease: EASE_OUT,
                    },
                  },
                  hidden: {
                    scale: 0.9,
                    transition: { duration: DURATION, ease: EASE_OUT },
                  },
                  exit: {
                    y: -150,
                    scale: 0.9,
                    transition: { duration: DURATION, ease: EASE_OUT },
                  },
                }}
              >
                <div className="flex flex-col gap-4 w-full max-w-xl md:gap-6 lg:gap-8">
                  <FormAccessRequest
                    onUnlock={handleUnlock}
                    input={(props) => (
                      <motion.input
                        autoCapitalize="off"
                        autoComplete="off"
                        placeholder="Request access or unlock platform"
                        className={inputVariants()}
                        initial={isInitialRender.current ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{
                          opacity: 0,
                          transition: {
                            duration: DURATION,
                            ease: EASE_OUT_OPACITY,
                          },
                        }}
                        transition={{
                          duration: DURATION,
                          ease: EASE_OUT,
                          delay: DELAY,
                        }}
                        {...props}
                      />
                    )}
                    submit={(props) => (
                      <motion.button
                        className={cn(
                          buttonVariants({
                            variant: "iconButton",
                            size: "icon-xl",
                          }),
                          isUnlocked ? "bg-green-600 hover:bg-green-700" : ""
                        )}
                        {...props}
                        initial={isInitialRender.current ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{
                          opacity: 0,
                          transition: {
                            duration: DURATION,
                            ease: EASE_OUT_OPACITY,
                          },
                        }}
                        transition={{
                          duration: DURATION,
                          ease: EASE_OUT,
                          delay: DELAY,
                        }}
                      >
                        {isUnlocked ? (
                          <LockOpen1Icon className="w-4 h-4 text-current" />
                        ) : (
                          <ArrowRightIcon className="w-4 h-4 text-current" />
                        )}
                      </motion.button>
                    )}
                  />
                  <motion.p
                    initial={isInitialRender.current ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{
                      opacity: 0,
                      transition: { duration: DURATION, ease: EASE_OUT_OPACITY },
                    }}
                    transition={{
                      duration: DURATION,
                      ease: EASE_OUT,
                      delay: DELAY,
                    }}
                    className="text-base sm:text-lg lg:text-xl !leading-[1.1] font-medium text-center text-white text-pretty"
                  >
                    {isUnlocked 
                      ? "Welcome! Redirecting to the platform..."
                      : "Join our exclusive wine community. Request access or enter your invitation code to unlock the platform."
                    }
                  </motion.p>
                </div>
              </motion.div>
            )}

            <motion.div
              layout="position"
              transition={SPRING}
              key="button"
              className={isOpen ? "my-6" : "mt-6"}
            >
              <Button
                className={cn("relative px-8")}
                onClick={() => setIsOpen(!isOpen)}
                shine={!isOpen}
              >
                <motion.span
                  animate={{ x: isOpen ? -16 : 0 }}
                  transition={{ duration: DURATION, ease: EASE_OUT }}
                  className="inline-block"
                >
                  About
                </motion.span>

                {isOpen && (
                  <motion.div
                    className={cn(
                      buttonVariants({ variant: "iconButton", size: "icon" }),
                      "absolute -top-px -right-px aspect-square"
                    )}
                    initial={{ opacity: 0, scale: 0.8, rotate: -40 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{
                      duration: DURATION,
                      ease: EASE_OUT,
                      delay: DELAY,
                    }}
                  >
                    <Cross1Icon className="size-5 text-primary-foreground" />
                  </motion.div>
                )}
              </Button>
            </motion.div>

            {isOpen && (
              <motion.div
                key="about"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{
                  visible: {
                    opacity: 1,
                    scale: 1,
                    transition: {
                      delay: DELAY,
                      duration: DURATION,
                      ease: EASE_OUT,
                    },
                  },
                  hidden: {
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: DURATION, ease: EASE_OUT },
                  },
                  exit: {
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: DURATION, ease: EASE_OUT_OPACITY },
                  },
                }}
                className="relative flex min-h-0 flex-shrink overflow-hidden text-sm md:text-base max-h-[calc(70dvh-var(--footer-safe-area))] flex-col gap-8 text-center backdrop-blur-xl text-balance border-2 border-white/20 bg-white/10 max-w-3xl text-white rounded-3xl ring-1 ring-offset-white/10 ring-white/10 ring-offset-2 shadow-button"
              >
                <article className="relative overflow-y-auto italic p-6 h-full [&_p]:my-4">
                  <p>
                    "CrowdVine represents the future of wine discovery and community. 
                    We believe that great wine should be accessible, but finding it 
                    shouldn't be overwhelming."
                  </p>
                  <p>
                    Our platform brings together wine enthusiasts, producers, and 
                    collectors in a curated environment where quality meets community. 
                    Every bottle tells a story, and every member contributes to our 
                    shared passion for exceptional wines.
                  </p>
                  <p>
                    We curate exceptional wines from boutique producers around the 
                    world, offering our community exclusive access to limited releases, 
                    rare vintages, and emerging winemakers. Our pallet-sharing system 
                    makes premium wines accessible while building connections between 
                    like-minded enthusiasts.
                  </p>
                  <p>
                    Join us in celebrating the art of winemaking, the joy of discovery, 
                    and the community that makes every sip more meaningful."
                  </p>
                </article>
              </motion.div>
            )}
          </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
