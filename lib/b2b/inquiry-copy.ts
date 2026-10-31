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

export type B2bInquiryCopyLocale = "sv" | "en";

export const B2B_INQUIRY_COPY = {
  sv: {
    cartCta: "Skicka förfrågan",
    pageTitle: "Beställningsförfrågan",
    pageIntro:
      "Skicka en förfrågan för vinerna i din varukorg. Vi återkommer med bekräftelse och faktura — ingen betalning sker här.",
    companyLabel: "Företag / restaurang",
    organizationNumberLabel: "Organisationsnummer",
    contactNameLabel: "Kontaktperson",
    emailLabel: "E-post",
    phoneLabel: "Telefon",
    deliveryAddressLabel: "Leveransadress",
    postalCodeLabel: "Postnummer",
    desiredDeliveryDateLabel: "Önskat leveransdatum",
    messageLabel: "Meddelande",
    messagePlaceholder: "Eventuella önskemål eller frågor (valfritt)",
    submit: "Skicka förfrågan",
    submitting: "Skickar…",
    loginCta: "Logga in för att skicka förfrågan",
    loginRequiredIntro:
      "Logga in för att skicka förfrågan. Du kommer tillbaka hit med din lista kvar.",
    emptyCart:
      "Varukorgen är tom. Lägg till viner från lagret innan du skickar en förfrågan.",
    backToShop: "Tillbaka till sortimentet",
    successTitle: "Tack för din förfrågan",
    successBody: DIRTYWINE_INQUIRY_FOLLOW_UP,
    privacyNote:
      "När du skickar formuläret behandlar vi dina uppgifter för att hantera förfrågan. Läs mer i vår",
    privacyLinkLabel: "integritetspolicy",
    privacyNoteSuffix: ".",
    stockUnavailable:
      "Ett eller flera viner finns inte längre i tillräckligt antal i B2B-lagret. Uppdatera varukorgen och försök igen.",
    producerLinesBlocked:
      "Beställning från producent är pausad. Ta bort producentviner från varukorgen — endast lagerviner kan förfrågas.",
    validationRequired: "Fyll i alla obligatoriska fält.",
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
    emailSignOff: `Hälsningar\n${DIRTYWINE_BRAND_NAME}`,
  },
  en: {
    cartCta: "Send inquiry",
    pageTitle: "Order inquiry",
    pageIntro:
      "Send an inquiry for the wines in your cart. We will follow up with confirmation and an invoice — no payment is taken here.",
    companyLabel: "Company / restaurant",
    organizationNumberLabel: "Organisation number",
    contactNameLabel: "Contact person",
    emailLabel: "Email",
    phoneLabel: "Phone",
    deliveryAddressLabel: "Delivery address",
    postalCodeLabel: "Postal code",
    desiredDeliveryDateLabel: "Preferred delivery date",
    messageLabel: "Message",
    messagePlaceholder: "Any requests or questions (optional)",
    submit: "Send inquiry",
    submitting: "Sending…",
    loginCta: "Log in to send an inquiry",
    loginRequiredIntro:
      "Log in to send an inquiry. You will return here with your list intact.",
    emptyCart:
      "Your cart is empty. Add warehouse wines before sending an inquiry.",
    backToShop: "Back to the catalogue",
    successTitle: "Thank you for your inquiry",
    successBody:
      "We will get back to you with confirmation and an invoice as soon as we can.",
    privacyNote:
      "When you submit this form we process your details to handle the inquiry. Read more in our",
    privacyLinkLabel: "privacy policy",
    privacyNoteSuffix: ".",
    stockUnavailable:
      "One or more wines are no longer available in sufficient B2B warehouse quantity. Update your cart and try again.",
    producerLinesBlocked:
      "Producer ordering is paused. Remove producer wines from the cart — only warehouse wines can be inquired.",
    validationRequired: "Please fill in all required fields.",
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
      "We will get back to you with confirmation and an invoice as soon as we can.",
    emailSignOff: `Best regards\n${DIRTYWINE_BRAND_NAME}`,
  },
} as const;

export function b2bInquiryCopy(locale: B2bInquiryCopyLocale) {
  return B2B_INQUIRY_COPY[locale] ?? B2B_INQUIRY_COPY.sv;
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
    c.desiredDeliveryDateLabel,
    c.messageLabel,
    c.messagePlaceholder,
    c.submit,
    c.submitting,
    c.loginCta,
    c.loginRequiredIntro,
    c.emptyCart,
    c.backToShop,
    c.successTitle,
    c.successBody,
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
