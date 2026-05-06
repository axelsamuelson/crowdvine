"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Loader2, Mail, Send } from "lucide-react";
import { buildCampaignEmailHtml } from "@/lib/email/campaign-template";

type TemplateCard = {
  id: string;
  title: string;
  trigger: string;
};

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    id: "welcome",
    title: "Välkomstmail",
    trigger: "Skickas efter registrering (API /signup-flöde)",
  },
  {
    id: "order_confirmation",
    title: "Orderbekräftelse",
    trigger: "Skickas vid lyckad checkout eller från checkout success-sidan",
  },
  {
    id: "payment_confirmed",
    title: "Betalning bekräftad (Stripe)",
    trigger: "Stripe webhook: payment_intent.succeeded",
  },
  {
    id: "payment_failed",
    title: "Betalning misslyckades (Stripe)",
    trigger: "Stripe webhook: payment_intent.payment_failed",
  },
  {
    id: "payment_cancelled",
    title: "Reservation avbokad",
    trigger: "Efter upprepade misslyckade betalningsförsök (payment-retry)",
  },
  {
    id: "access_approved",
    title: "Access godkänd",
    trigger: "När admin godkänner access-request",
  },
  {
    id: "pallet_ready",
    title: "Pall full – dags att betala",
    trigger: "När triggerPaymentNotifications / sendPaymentReadyEmail körs",
  },
  {
    id: "payment_reminder",
    title: "Betalningspåminnelse",
    trigger: "Deprecated flow (sendPaymentReminder) — mall kvar för referens",
  },
  {
    id: "operations_digest",
    title: "Operations weekly digest",
    trigger: "Veckoschema / manuellt test (operations digest)",
  },
];

type FlowRow = {
  name: string;
  trigger: string;
  recipient: string;
  template: string;
  status: "active" | "unlinked";
  fileRef: string;
};

const EMAIL_FLOWS: FlowRow[] = [
  {
    name: "Välkomstmail",
    trigger: "Registrering / POST /api/email/welcome",
    recipient: "Kunden",
    template: "getWelcomeEmailTemplate",
    status: "active",
    fileRef: "app/api/email/welcome/route.ts",
  },
  {
    name: "Orderbekräftelse (checkout)",
    trigger: "Lyckad order — POST /api/checkout/confirm",
    recipient: "Kunden",
    template: "buildOrderConfirmationHtml",
    status: "active",
    fileRef: "app/api/checkout/confirm/route.ts",
  },
  {
    name: "Orderbekräftelse (success-sida)",
    trigger: "Kund laddar checkout success",
    recipient: "Kunden",
    template: "buildOrderConfirmationHtml",
    status: "active",
    fileRef: "app/checkout/success/page.tsx → /api/email/order-confirmation",
  },
  {
    name: "Access godkänd",
    trigger: "Admin uppdaterar access-request till approved",
    recipient: "Kunden",
    template: "getAccessApprovalEmailTemplate",
    status: "active",
    fileRef: "app/api/admin/access-requests/route.ts",
  },
  {
    name: "Betalning bekräftad",
    trigger: "Stripe webhook: payment_intent.succeeded",
    recipient: "Kunden",
    template: "buildPaymentConfirmedHtml",
    status: "active",
    fileRef: "app/api/stripe/webhook/route.ts",
  },
  {
    name: "Betalning misslyckades",
    trigger: "Stripe webhook: payment_intent.payment_failed",
    recipient: "Kunden",
    template: "buildPaymentFailedHtml",
    status: "active",
    fileRef: "app/api/stripe/webhook/route.ts",
  },
  {
    name: "Reservation avbokad (betalning)",
    trigger: "Max retries / payment-retry avslutas",
    recipient: "Kunden",
    template: "buildPaymentCancelledHtml",
    status: "active",
    fileRef: "lib/payment-retry.ts",
  },
  {
    name: "Pall full — betalningsmail",
    trigger: "triggerPaymentNotifications(palletId)",
    recipient: "Kunder med reservation på pallen",
    template: "generatePaymentEmailHTML",
    status: "unlinked",
    fileRef: "lib/email/pallet-complete.ts (triggerPaymentNotifications saknar anrop i repot)",
  },
  {
    name: "Operations digest",
    trigger: "Veckojobb / cron + inställningar",
    recipient: "Adminprofiler",
    template: "digestPayloadToHtml",
    status: "active",
    fileRef: "lib/operations-weekly-digest.ts",
  },
];

type RecipientGroup = "all" | "no_order" | "active_reservation" | "single";

export default function AdminEmailPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [fromName, setFromName] = useState("PACT");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [recipientGroup, setRecipientGroup] =
    useState<RecipientGroup>("single");
  const [singleEmail, setSingleEmail] = useState("");
  const [campaignPreviewOpen, setCampaignPreviewOpen] = useState(false);
  const [campaignHtml, setCampaignHtml] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [campaignSending, setCampaignSending] = useState(false);
  const [countLoading, setCountLoading] = useState(false);

  const openTemplatePreview = useCallback(async (templateId: string, title: string) => {
    setPreviewTitle(title);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    try {
      const res = await fetch("/api/admin/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId, previewOnly: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kunde inte ladda förhandsgranskning");
      }
      setPreviewHtml(data.html ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Förhandsgranskning misslyckades");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const sendTest = useCallback(async (templateId: string) => {
    setSendingId(templateId);
    try {
      const res = await fetch("/api/admin/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kunde inte skicka testmail");
      }
      toast.success(`Testmail skickat till ${data.sentTo ?? "din adress"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Testmail misslyckades");
    } finally {
      setSendingId(null);
    }
  }, []);

  const openCampaignPreview = useCallback(() => {
    if (!campaignSubject.trim()) {
      toast.error("Fyll i ämnesrad först");
      return;
    }
    const html = buildCampaignEmailHtml({
      subject: campaignSubject.trim(),
      messagePlain: campaignMessage,
    });
    setCampaignHtml(html);
    setCampaignPreviewOpen(true);
  }, [campaignSubject, campaignMessage]);

  const fetchRecipientCount = useCallback(async (): Promise<number> => {
    const res = await fetch("/api/admin/email/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        recipientGroup,
        singleEmail: recipientGroup === "single" ? singleEmail : undefined,
        countOnly: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Kunde inte räkna mottagare");
    }
    return typeof data.count === "number" ? data.count : 0;
  }, [recipientGroup, singleEmail]);

  const openSendConfirm = useCallback(async () => {
    if (!campaignSubject.trim() || !campaignMessage.trim()) {
      toast.error("Ämnesrad och meddelande krävs");
      return;
    }
    if (recipientGroup === "single" && !singleEmail.trim()) {
      toast.error("Ange e-postadress");
      return;
    }
    setCountLoading(true);
    try {
      const n = await fetchRecipientCount();
      if (n === 0) {
        toast.error("Inga mottagare för valt filter");
        return;
      }
      setConfirmCount(n);
      setConfirmOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte hämta antal");
    } finally {
      setCountLoading(false);
    }
  }, [
    campaignSubject,
    campaignMessage,
    recipientGroup,
    singleEmail,
    fetchRecipientCount,
  ]);

  const sendCampaign = useCallback(async () => {
    setCampaignSending(true);
    try {
      const res = await fetch("/api/admin/email/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipientGroup,
          singleEmail: recipientGroup === "single" ? singleEmail : undefined,
          fromName,
          subject: campaignSubject.trim(),
          message: campaignMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Utskick misslyckades");
      }
      toast.success(
        `Skickat: ${data.sent ?? 0}, misslyckade: ${data.failed ?? 0}`,
      );
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        console.warn("Campaign errors:", data.errors);
      }
      setConfirmOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Utskick misslyckades");
    } finally {
      setCampaignSending(false);
    }
  }, [
    recipientGroup,
    singleEmail,
    fromName,
    campaignSubject,
    campaignMessage,
  ]);

  const flowRows = useMemo(() => EMAIL_FLOWS, []);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="h-7 w-7" />
          E-post
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm max-w-2xl">
          Mallar, automatiska flöden och enkla utskick till valda grupper.
        </p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="templates">Mallar</TabsTrigger>
          <TabsTrigger value="flows">Flöden</TabsTrigger>
          <TabsTrigger value="campaigns">Utskick</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {TEMPLATE_CARDS.map((t) => (
              <Card
                key={t.id}
                className="border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12]"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {t.trigger}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openTemplatePreview(t.id, t.title)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Förhandsgranska
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={sendingId === t.id}
                    onClick={() => sendTest(t.id)}
                  >
                    {sendingId === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Skicka test
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flows" className="mt-6">
          <Card className="border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12]">
            <CardHeader>
              <CardTitle>Automatiska mailflöden</CardTitle>
              <CardDescription>
                Översikt över triggers och mallar (MVP-dokumentation).
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#1F1F23] text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4 font-medium">Flöde</th>
                    <th className="py-2 pr-4 font-medium">Trigger</th>
                    <th className="py-2 pr-4 font-medium">Mottagare</th>
                    <th className="py-2 pr-4 font-medium">Mall</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Fil</th>
                  </tr>
                </thead>
                <tbody>
                  {flowRows.map((row) => (
                    <tr
                      key={row.name + row.fileRef}
                      className="border-b border-gray-100 dark:border-[#1F1F23]/80 align-top"
                    >
                      <td className="py-3 pr-4 text-gray-900 dark:text-white font-medium">
                        {row.name}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {row.trigger}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {row.recipient}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 font-mono text-xs">
                        {row.template}
                      </td>
                      <td className="py-3 pr-4">
                        {row.status === "active" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
                          >
                            Ej kopplad
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {row.fileRef}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <Card className="border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] max-w-2xl">
            <CardHeader>
              <CardTitle>Utskick</CardTitle>
              <CardDescription>
                Plain text som wrappas i en enkel PACT-layout. Mottagare hämtas
                från databasen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mottagargrupp</Label>
                <Select
                  value={recipientGroup}
                  onValueChange={(v) => setRecipientGroup(v as RecipientGroup)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla registrerade användare</SelectItem>
                    <SelectItem value="no_order">
                      Användare utan order_reservations-rad
                    </SelectItem>
                    <SelectItem value="active_reservation">
                      Användare med aktiv reservation
                    </SelectItem>
                    <SelectItem value="single">Specifik e-postadress</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recipientGroup === "single" ? (
                <div className="space-y-2">
                  <Label htmlFor="single-email">E-post</Label>
                  <Input
                    id="single-email"
                    type="email"
                    placeholder="du@exempel.se"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="from-name">Från-namn</Label>
                <Input
                  id="from-name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="PACT"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="camp-subject">Ämnesrad</Label>
                <Input
                  id="camp-subject"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  placeholder="Nyheter från PACT"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="camp-msg">Meddelande (plain text)</Label>
                <Textarea
                  id="camp-msg"
                  rows={8}
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  placeholder="Skriv ditt meddelande här…"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={openCampaignPreview}>
                  <Eye className="h-4 w-4 mr-1" />
                  Förhandsgranska
                </Button>
                <Button
                  type="button"
                  onClick={openSendConfirm}
                  disabled={countLoading}
                >
                  {countLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Skicka
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[320px] border rounded-md overflow-hidden bg-white">
            {previewLoading ? (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <iframe
                title="Förhandsgranskning"
                className="w-full h-[70vh] max-h-[560px] border-0"
                sandbox="allow-same-origin"
                srcDoc={previewHtml}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignPreviewOpen} onOpenChange={setCampaignPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Förhandsgranskning — utskick</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[320px] border rounded-md overflow-hidden bg-white">
            <iframe
              title="Campaign preview"
              className="w-full h-[70vh] max-h-[560px] border-0"
              sandbox="allow-same-origin"
              srcDoc={campaignHtml}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekräfta utskick</AlertDialogTitle>
            <AlertDialogDescription>
              Du är på väg att skicka till {confirmCount} mottagare. Fortsätt?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={campaignSending}>Avbryt</AlertDialogCancel>
            <Button onClick={sendCampaign} disabled={campaignSending}>
              {campaignSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Skicka nu"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
