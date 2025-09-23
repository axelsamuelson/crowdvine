"use client";

import { Form, FormControl, FormField, FormItem, FormMessage, FormStateMessage } from "@/components/ui/form";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTitle, alertVariants } from "@/components/ui/alert";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const accessRequestSchema = z.object({
  input: z.string().min(1, "Please enter an email or invitation code"),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

type AccessRequestSchema = z.infer<typeof accessRequestSchema>;

const SPRING = {
  type: "spring" as const,
  stiffness: 130.40,
  damping: 14.50,
  mass: 1,
};

interface ActionResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  id?: string;
}

const SubmissionStateMessage = ({ 
  value, 
  reset 
}: { 
  value: ActionResult<string> | null; 
  reset: () => void; 
}) => {
  const form = useFormContext<AccessRequestSchema>();

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      reset();
    }
  }, [form.formState.errors, reset]);
  
  return (
    <FormStateMessage>
      {value?.success === true && (
        <motion.div
          key={value.id}
          className={cn(
            "relative backdrop-blur-xl border-2 border-white/20 bg-white/10 text-white rounded-2xl p-4 mx-2 sm:mx-4 mb-4",
            "shadow-lg ring-1 ring-offset-white/10 ring-white/10 ring-offset-2"
          )}
          exit={{ opacity: 0, y: 10, scale: 0.8 }}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING}
        >
          <div className="flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm sm:text-base font-medium text-white/90">{value.data}</p>
          </div>
        </motion.div>
      )}
    </FormStateMessage>
  )
}

const getDefaultValues = () => {
  if (typeof window !== 'undefined') {
    const input = localStorage.getItem('access-input');
    return { input: input || '' };
  }
  return { input: '' };
}

export const FormAccessRequest = ({
  input,
  submit,
  onUnlock,
}: {
  input: (props: React.ComponentProps<"input">) => React.ReactNode;
  submit: (props: React.ComponentProps<"button">) => React.ReactNode;
  onUnlock: () => void;
}) => {
  const [submissionState, setSubmissionState] = useState<ActionResult<string> | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<AccessRequestSchema>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: getDefaultValues()
  });

  const inviteForm = useForm({
    resolver: zodResolver(z.object({
      email: z.string().email("Please enter a valid email"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    })),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    return () => {
      const v = form.getValues('input');
      if (v != undefined) {
        localStorage.setItem('access-input', v);
      }
    }
  }, [form]);

  async function onSubmit(values: AccessRequestSchema) {
    const input = values.input.trim();
    
    console.log('Input received:', input);
    console.log('Input length:', input.length);
    
    // Check if input looks like an invitation code (20 characters, no @ symbol)
    const isInvitationCode = input.length === 20 && !input.includes('@');
    console.log('Is invitation code:', isInvitationCode);
    
    if (isInvitationCode) {
      console.log('Processing as invitation code');
      // Redirect to dedicated code signup page
      window.location.href = `/code-signup?code=${input}`;
    } else {
      console.log('Processing as email');
      // Handle email access request
      const state = await requestAccess(input);
      setSubmissionState(state);
      
      if (state.success === true) {
        form.reset({ input: '' });
      } else {
        form.setError("input", { message: state.message || "Failed to submit request" });
      }
    }
  }

  async function handleInviteSubmit(values: { email: string; password: string }) {
    setIsProcessing(true);
    
    try {
      const state = await validateInvitationCodeWithCredentials(inviteCode, values.email, values.password);
      
      if (state.success === true) {
        setShowInviteModal(false);
        form.reset({ input: '' });
        inviteForm.reset();
        onUnlock();
        // Redirect to main app after successful registration
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        inviteForm.setError("email", { message: state.message || "Invalid invitation code" });
      }
    } catch (error) {
      inviteForm.setError("email", { message: "Network error. Please try again." });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
          <SubmissionStateMessage value={submissionState} reset={() => setSubmissionState(null)} />

          <FormField
            control={form.control}
            name="input"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormMessage className="text-red-400 text-xs sm:text-sm px-2" />
                <FormControl>
                  <div className="relative">
                    {input({ ...field })}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                      {submit({
                        type: "submit",
                        disabled: form.formState.isSubmitting,
                      })}
                    </div>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* Invitation Code Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto bg-white/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="text-center text-lg sm:text-xl font-semibold text-gray-900 px-2">
              Complete Your Registration
            </DialogTitle>
          </DialogHeader>
          
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4 px-2 sm:px-0">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...inviteForm.register("email")}
                  className="bg-white/80 border-gray-200"
                />
                {inviteForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{inviteForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  {...inviteForm.register("password")}
                  className="bg-white/80 border-gray-200"
                />
                {inviteForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{inviteForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

// API functions
  async function validateInvitationCodeWithCredentials(code: string, email: string, password: string): Promise<ActionResult<string>> {
  try {
    const response = await fetch('/api/invitations/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, code }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        data: "Platform unlocked! Welcome to CrowdVine.",
        id: Date.now().toString(),
      };
    } else {
      return {
        success: false,
        message: result.error || "Invalid invitation code",
        id: Date.now().toString(),
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Network error. Please try again.",
      id: Date.now().toString(),
    };
  }
}

async function validateInvitationCode(code: string): Promise<ActionResult<string>> {
  try {
    const response = await fetch('/api/invitations/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        data: "Valid invitation code! Complete your registration below.",
        id: Date.now().toString(),
      };
    } else {
      return {
        success: false,
        message: result.error || "Invalid invitation code",
        id: Date.now().toString(),
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Network error. Please try again.",
      id: Date.now().toString(),
    };
  }
}

async function requestAccess(email: string): Promise<ActionResult<string>> {
  try {
    const response = await fetch('/api/access-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        data: result.message || "Access request submitted! We'll review your application soon.",
        id: Date.now().toString(),
      };
    } else {
      return {
        success: false,
        message: result.error || "Failed to submit request",
        id: Date.now().toString(),
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Network error. Please try again.",
      id: Date.now().toString(),
    };
  }
}
