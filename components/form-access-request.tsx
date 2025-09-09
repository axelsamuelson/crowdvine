"use client";

import { Form, FormControl, FormField, FormItem, FormMessage, FormStateMessage } from "@/components/ui/form";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTitle, alertVariants } from "@/components/ui/alert";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";

const accessRequestSchema = z.object({
  input: z.string().min(1, "Please enter an email or invitation code"),
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
            alertVariants({ variant: "success" }),
            "absolute top-0 left-0 right-0 mx-auto w-max"
          )}
          exit={{ opacity: 0, y: 10, scale: 0.8 }}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING}
        >
          <CheckCircledIcon />
          <AlertTitle>{value.data}</AlertTitle>
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

  const form = useForm<AccessRequestSchema>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: getDefaultValues()
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
    
    // Check if input looks like an invitation code (20 digits)
    const isInvitationCode = /^\d{20}$/.test(input);
    
    if (isInvitationCode) {
      // Handle invitation code
      const state = await validateInvitationCode(input);
      setSubmissionState(state);
      
      if (state.success === true) {
        form.reset({ input: '' });
        onUnlock();
      } else {
        form.setError("input", { message: state.message || "Invalid invitation code" });
      }
    } else {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="relative pt-10 lg:pt-12">
        <SubmissionStateMessage value={submissionState} reset={() => setSubmissionState(null)} />

        <FormField
          control={form.control}
          name="input"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormMessage />
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
  );
};

// API functions
async function validateInvitationCode(code: string): Promise<ActionResult<string>> {
  try {
    const response = await fetch('/api/invitation-codes/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data: "Platform unlocked! Welcome to CrowdVine.",
        id: Date.now().toString(),
      };
    } else {
      return {
        success: false,
        message: data.error || "Invalid invitation code",
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data: "Access request submitted! We'll review your application soon.",
        id: Date.now().toString(),
      };
    } else {
      return {
        success: false,
        message: data.error || "Failed to submit request",
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
