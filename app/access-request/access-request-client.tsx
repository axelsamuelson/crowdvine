"use client";

import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormAccessRequest } from "@/components/form-access-request";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowRightIcon,
  Cross1Icon,
  LockClosedIcon,
  LockOpen1Icon,
} from "@radix-ui/react-icons";
import { inputVariants } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Background } from "@/components/background";
import { FooterLogoSvg } from "@/components/layout/footer-logo-svg";

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

export function AccessRequestClient() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const router = useRouter();

  const isInitialRender = useRef(true);

  useEffect(() => {
    return () => {
      isInitialRender.current = false;
    };
  }, [isOpen]);

  // Smart access check: check authentication and access status
  useEffect(() => {
    const checkExistingAccess = async () => {
      try {
        // Check if user is authenticated and has access
        const response = await fetch("/api/me/access");
        const data = await response.json();

        if (data.access) {
          // User is authenticated and has access, redirect to destination
          const urlParams = new URLSearchParams(window.location.search);
          const next = urlParams.get("next") || "/";
          window.location.href = next;
          return;
        }
      } catch (error) {
        // Ignore errors, show access request form normally
        console.log("Access check failed, showing access request form");
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkExistingAccess();
  }, []);

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
    // Redirect to signup after successful unlock
    setTimeout(() => {
      router.push("/signup");
    }, 2000); // Increased delay to show success message longer
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 h-[100dvh] w-full">
        <div className="relative h-full w-full">
          <Background src="https://cdn.pixabay.com/video/2022/10/19/135643-762117669_large.mp4" />
          <div className="flex overflow-hidden relative flex-col gap-3 sm:gap-4 justify-center items-center w-full h-full max-w-4xl mx-auto z-10 px-2 sm:px-4">
            <motion.div
              layout="position"
              transition={{ duration: DURATION, ease: EASE_OUT }}
              className="flex justify-center"
            >
              <FooterLogoSvg className="h-12 sm:h-16 md:h-20 lg:h-24 xl:h-32 w-auto text-white" />
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
                    <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8 w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl">
                      <FormAccessRequest
                        onUnlock={handleUnlock}
                        input={(props) => (
                          <motion.input
                            autoCapitalize="off"
                            autoComplete="off"
                            placeholder="Request access or unlock platform"
                            className={inputVariants()}
                            initial={
                              isInitialRender.current ? false : { opacity: 0 }
                            }
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
                              isUnlocked
                                ? "bg-green-600 hover:bg-green-700"
                                : "",
                            )}
                            {...props}
                            initial={
                              isInitialRender.current ? false : { opacity: 0 }
                            }
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
                        initial={
                          isInitialRender.current ? false : { opacity: 0 }
                        }
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
                        className="text-sm sm:text-base md:text-lg lg:text-xl !leading-[1.1] font-medium text-center text-white text-pretty px-2"
                      >
                        {isUnlocked
                          ? "Welcome! Redirecting to sign up..."
                          : isCheckingAccess
                            ? "Checking if you already have access..."
                            : ""}
                      </motion.p>

                      {/* Sign in button for existing users */}
                      {!isUnlocked && !isCheckingAccess && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: DURATION,
                            ease: EASE_OUT,
                            delay: DELAY + 0.2,
                          }}
                          className="flex gap-4 justify-center items-center"
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 20,
                            }}
                          >
                            <Button
                              onClick={() => {
                                const urlParams = new URLSearchParams(
                                  window.location.search,
                                );
                                const next = urlParams.get("next") || "/";
                                window.location.href = `/log-in?next=${encodeURIComponent(next)}`;
                              }}
                              className={cn(
                                "relative px-4 sm:px-6 md:px-8 text-white border-white/50 hover:border-white/80 bg-white/20 hover:bg-white/30",
                                "backdrop-blur-sm transition-all duration-300 ease-out text-sm sm:text-base",
                              )}
                            >
                              Already have access
                            </Button>
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 20,
                            }}
                          >
                            <Button
                              onClick={() => setIsOpen(true)}
                              className={cn(
                                "relative px-4 sm:px-6 md:px-8 text-white border-white/50 hover:border-white/80 bg-white/20 hover:bg-white/30",
                                "backdrop-blur-sm transition-all duration-300 ease-out text-sm sm:text-base",
                              )}
                            >
                              About
                            </Button>
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {isOpen && !isUnlocked && !isCheckingAccess && (
                  <motion.div
                    layout="position"
                    transition={SPRING}
                    key="close-button"
                    className="my-4 sm:my-6"
                  >
                    <Button
                      className={cn(
                        "relative px-4 sm:px-6 md:px-8 text-white border-white/50 hover:border-white/80 bg-white/20 hover:bg-white/30 text-sm sm:text-base",
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <motion.span
                        animate={{ x: -16 }}
                        transition={{ duration: DURATION, ease: EASE_OUT }}
                        className="inline-block"
                      >
                        Close
                      </motion.span>

                      <motion.div
                        className={cn(
                          buttonVariants({
                            variant: "iconButton",
                            size: "icon",
                          }),
                          "absolute -top-px -right-px aspect-square",
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
                    </Button>
                  </motion.div>
                )}

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
                        transition: {
                          duration: DURATION,
                          ease: EASE_OUT_OPACITY,
                        },
                      },
                    }}
                    className="relative flex min-h-0 flex-shrink overflow-hidden text-sm md:text-base max-h-[calc(60vh)] sm:max-h-[calc(70dvh-var(--footer-safe-area))] flex-col gap-4 sm:gap-6 md:gap-8 text-center backdrop-blur-xl text-balance border-2 border-white/20 bg-white/10 max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-3xl text-white rounded-2xl sm:rounded-3xl ring-1 ring-offset-white/10 ring-white/10 ring-offset-2 shadow-button mx-2 sm:mx-4"
                  >
                    <article className="relative overflow-y-auto italic p-4 sm:p-6 h-full [&_p]:my-3 sm:[&_p]:my-4 text-sm sm:text-base">
                      <p>
                        "PACT represents the future of wine — a direct
                        connection between producers and consumers. We believe
                        exceptional wine should reach those who appreciate it,
                        without traditional barriers."
                      </p>
                      <p>
                        Our platform brings producers and consumers together in
                        a shared pallet system. By consolidating shipments, we
                        make boutique wines from around the world accessible and
                        affordable. Every bottle travels from vineyard to your
                        door with transparency and care.
                      </p>
                      <p>
                        PACT — Producers And Consumers Together — is more than a
                        marketplace. It's a community built on trust, quality,
                        and the shared joy of discovering exceptional wines.
                        Join passionate wine lovers and dedicated producers in
                        reshaping how great wine is bought and sold.
                      </p>
                      <p>
                        Request access to explore limited releases, support
                        independent winemakers, and connect with a community
                        that values authenticity and craftsmanship.
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
