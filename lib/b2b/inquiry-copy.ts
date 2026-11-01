/**
 * Customer-facing copy for Dirtywine B2B inquiry mode.
 * Juliette / counsel: review strings below (sv primary; en for EN UI).
 * Keep in sync with messages/sv.json + messages/en.json keys under b2bInquiry.*.
 */

import {
  DIRTYWINE_BRAND_NAME,
  DIRTYWINE_INQUIRY_EMAIL_HEADLINE,
  DIRTYWINE_INQUIRY_FOLLOW_UP,
} from "@/lib/b2b/brand";
import type { B2bInquiryFieldKey } from "@/lib/b2b/inquiry-validation";

export type B2bInquiryCopyLocale = "sv" | "en";

export const B2B_INQUIRY_COPY = {
  sv: {
    cartCta: "Skicka förfrågan",
    pageTitle: "Beställningsförfrågan",
    pageIntro:
      "Vi återkommer med bekräftelse och faktura. Ingen betalning sker här.",
    companyLabel: "Företag / restaurang",
    organizationNumberLabel: "Organisationsnummer",
    contactNameLabel: "Kontaktperson",
    emailLabel: "E-post",
    phoneLabel: "Telefon (valfritt)",
    deliveryAddressLabel: "Leveransadress",
    postalCodeLabel: "Postnummer",
    cityLabel: "Ort",
    desiredDeliveryDateLabel: "Önskat leveransdatum (valfritt)",
    messageLabel: "Meddelande (valfritt)",
    messagePlaceholder: "Eventuella önskemål eller frågor",
    submit: "Skicka förfrågan",
    submitting: "Skickar…",
    loginCta: "Logga in för att skicka förfrågan",
    loginRequiredIntro:
      "Logga in för att skicka förfrågan. Du kommer tillbaka hit med din lista kvar.",
    createAccountCta: "Skapa konto",
    createAccountHint:
      "Med ett konto ser du dina förfrågningar och fakturor på ett ställe.",
    createAccountSkip: "Inte nu",
    createAccountDone: "Förfrågan sparad på ditt konto.",
    loginExistingCta: "Logga in",
    emptyCart:
      "Varukorgen är tom. Lägg till viner från lagret innan du skickar en förfrågan.",
    backToShop: "Tillbaka till sortimentet",
    successTitle: "Tack för din förfrågan",
    successBody: DIRTYWINE_INQUIRY_FOLLOW_UP,
    emailCopySent: "Vi har skickat en kopia till",
    privacyNote:
      "Vi behandlar dina uppgifter för att hantera förfrågan. Läs mer i vår",
    privacyLinkLabel: "integritetspolicy",
    privacyNoteSuffix: ".",
    stockUnavailable:
      "Ett eller flera viner finns inte längre i tillräckligt antal i B2B-lagret. Uppdatera varukorgen och försök igen.",
    producerLinesBlocked:
      "Beställning från producent är pausad. Ta bort producentviner från varukorgen — endast lagerviner kan förfrågas.",
    validationRequired: "Fyll i alla obligatoriska fält.",
    validationSummaryOne: "1 fält behöver fyllas i",
    validationSummaryMany: "{count} fält behöver fyllas i",
    fieldFillCompany: "Fyll i företag / restaurang",
    fieldFillOrg: "Ange ett giltigt organisationsnummer",
    fieldFillContact: "Fyll i kontaktperson",
    fieldFillEmail: "Fyll i e-post",
    fieldInvalidEmail: "Ange en giltig e-postadress",
    fieldFillPhone: "Ange ett giltigt telefonnummer",
    fieldFillAddress: "Fyll i leveransadress",
    fieldFillPostal: "Ange ett giltigt postnummer",
    fieldFillCity: "Fyll i ort",
    fieldInvalidDate: "Ange ett giltigt leveransdatum (åååå-mm-dd)",
    validationEmail: "Ange en giltig e-postadress.",
    validationPostalCode: "Ange ett giltigt svenskt postnummer (5 siffror).",
    validationPhone: "Ange ett giltigt telefonnummer.",
    validationOrgNumber: "Ange ett giltigt organisationsnummer.",
    validationDeliveryDate: "Ange ett giltigt leveransdatum (YYYY-MM-DD).",
    rateLimited: "För många försök. Vänta en stund och försök igen.",
    genericError: "Kunde inte skicka förfrågan. Försök igen.",
    cartSummary: "Din förfrågan",
    exclVatHint: "Priser exkl. moms",
    totalBottlesLabel: "flaskor",
    totalExclVatLabel: "Totalt",
    emailSubjectCustomer: `${DIRTYWINE_INQUIRY_EMAIL_HEADLINE} – ${DIRTYWINE_BRAND_NAME}`,
    emailBodyCustomer: DIRTYWINE_INQUIRY_FOLLOW_UP,
    emailSignOff: `Hälsningar, Dirty Wine`,
  },
  en: {
    cartCta: "Send inquiry",
    pageTitle: "Order inquiry",
    pageIntro:
      "We will follow up with confirmation and an invoice. No payment is taken here.",
    companyLabel: "Company / restaurant",
    organizationNumberLabel: "Organisation number",
    contactNameLabel: "Contact person",
    emailLabel: "Email",
    phoneLabel: "Phone (optional)",
    deliveryAddressLabel: "Delivery address",
    postalCodeLabel: "Postal code",
    cityLabel: "City",
    desiredDeliveryDateLabel: "Preferred delivery date (optional)",
    messageLabel: "Message (optional)",
    messagePlaceholder: "Any requests or questions",
    submit: "Send inquiry",
    submitting: "Sending…",
    loginCta: "Log in to send an inquiry",
    loginRequiredIntro:
      "Log in to send an inquiry. You will return here with your list intact.",
    createAccountCta: "Create account",
    createAccountHint:
      "With an account you can see your inquiries and invoices in one place.",
    createAccountSkip: "Not now",
    createAccountDone: "Inquiry saved to your account.",
    loginExistingCta: "Log in",
    emptyCart:
      "Your cart is empty. Add warehouse wines before sending an inquiry.",
    backToShop: "Back to the catalogue",
    successTitle: "Thank you for your inquiry",
    successBody:
      "We will get back to you with confirmation and an invoice within one business day.",
    emailCopySent: "We have sent a copy to",
    privacyNote:
      "When you submit this form we process your details to handle the inquiry. Read more in our",
    privacyLinkLabel: "privacy policy",
    privacyNoteSuffix: ".",
    stockUnavailable:
      "One or more wines are no longer available in sufficient B2B warehouse quantity. Update your cart and try again.",
    producerLinesBlocked:
      "Producer ordering is paused. Remove producer wines from the cart — only warehouse wines can be inquired.",
    validationRequired: "Please fill in all required fields.",
    validationSummaryOne: "1 field needs to be completed",
    validationSummaryMany: "{count} fields need to be completed",
    fieldFillCompany: "Enter company / restaurant",
    fieldFillOrg: "Enter a valid organisation number",
    fieldFillContact: "Enter contact person",
    fieldFillEmail: "Enter email",
    fieldInvalidEmail: "Enter a valid email address",
    fieldFillPhone: "Enter a valid phone number",
    fieldFillAddress: "Enter delivery address",
    fieldFillPostal: "Enter a valid postal code",
    fieldFillCity: "Enter city",
    fieldInvalidDate: "Enter a valid delivery date (YYYY-MM-DD)",
    validationEmail: "Enter a valid email address.",
    validationPostalCode: "Enter a valid Swedish postal code (5 digits).",
    validationPhone: "Enter a valid phone number.",
    validationOrgNumber: "Enter a valid organisation number.",
    validationDeliveryDate: "Enter a valid delivery date (YYYY-MM-DD).",
    rateLimited: "Too many attempts. Please wait and try again.",
    genericError: "Could not send the inquiry. Please try again.",
    cartSummary: "Your inquiry",
    exclVatHint: "Prices excl. VAT",
    totalBottlesLabel: "bottles",
    totalExclVatLabel: "Total",
    emailSubjectCustomer: `${DIRTYWINE_INQUIRY_EMAIL_HEADLINE} – ${DIRTYWINE_BRAND_NAME}`,
    emailBodyCustomer:
      "We will get back to you with confirmation and an invoice within one business day.",
    emailSignOff: `Best regards\n${DIRTYWINE_BRAND_NAME}`,
  },
} as const;

export function b2bInquiryCopy(locale: B2bInquiryCopyLocale) {
  return B2B_INQUIRY_COPY[locale] ?? B2B_INQUIRY_COPY.sv;
}

export function b2bInquiryFieldMessage(
  locale: B2bInquiryCopyLocale,
  field: B2bInquiryFieldKey,
  code: string,
): string {
  const c = b2bInquiryCopy(locale);
  switch (field) {
    case "companyName":
      return c.fieldFillCompany;
    case "organizationNumber":
      return code === "org_number" ? c.fieldFillOrg : c.fieldFillOrg;
    case "contactName":
      return c.fieldFillContact;
    case "email":
      return code === "email" ? c.fieldInvalidEmail : c.fieldFillEmail;
    case "phone":
      return c.fieldFillPhone;
    case "deliveryAddress":
      return c.fieldFillAddress;
    case "postalCode":
      return c.fieldFillPostal;
    case "city":
      return c.fieldFillCity;
    case "desiredDeliveryDate":
      return c.fieldInvalidDate;
    default:
      return c.validationRequired;
  }
}

export function b2bInquiryValidationSummary(
  locale: B2bInquiryCopyLocale,
  count: number,
): string {
  const c = b2bInquiryCopy(locale);
  if (count <= 1) return c.validationSummaryOne;
  return c.validationSummaryMany.replace("{count}", String(count));
}

/** Flat list for PR / legal review (Swedish primary). */
export function listB2bInquiryCustomerFacingSvTexts(): string[] {
  const c = B2B_INQUIRY_COPY.sv;
  return [
    c.cartCta,
    c.pageTitle,
    c.pageIntro,
    c.companyLabel,
    c.organizationNumberLabel,
    c.contactNameLabel,
    c.emailLabel,
    c.phoneLabel,
    c.deliveryAddressLabel,
    c.postalCodeLabel,
    c.cityLabel,
    c.desiredDeliveryDateLabel,
    c.messageLabel,
    c.messagePlaceholder,
    c.submit,
    c.submitting,
    c.loginCta,
    c.loginRequiredIntro,
    c.createAccountCta,
    c.createAccountHint,
    c.createAccountSkip,
    c.createAccountDone,
    c.loginExistingCta,
    c.emptyCart,
    c.backToShop,
    c.successTitle,
    c.successBody,
    c.emailCopySent,
    `${c.privacyNote} ${c.privacyLinkLabel}${c.privacyNoteSuffix}`,
    c.stockUnavailable,
    c.producerLinesBlocked,
    c.validationRequired,
    c.validationEmail,
    c.validationPostalCode,
    c.validationPhone,
    c.validationOrgNumber,
    c.validationDeliveryDate,
    c.rateLimited,
    c.genericError,
    c.cartSummary,
    c.exclVatHint,
    c.totalBottlesLabel,
    c.totalExclVatLabel,
    c.emailSubjectCustomer,
    c.emailBodyCustomer,
    c.emailSignOff,
  ];
}
