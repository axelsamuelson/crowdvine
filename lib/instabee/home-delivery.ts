import { getCustomerNumber, instabeeRequest } from "./client";

export interface InstabeeHomeDeliveryOrderParams {
  orderId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  totalBottles: number;
}

export interface InstabeePackingResult {
  parcelId: string;
  labelUrl: string | null;
  trackingUrl: string | null;
}

interface InstabeeOrderResponse {
  parcelId?: string;
  links?: {
    label?: string;
    tracking?: string;
  };
}

export async function validatePostalCode(
  postalCode: string,
  countryCode: string = "SE",
): Promise<boolean> {
  try {
    const customerNumber = getCustomerNumber();
    const res = await instabeeRequest<{
      available?: boolean;
    }>(
      `/v1/availability` +
        `?postalCode=${encodeURIComponent(postalCode)}` +
        `&countryCode=${countryCode}` +
        `&brand=Budbee` +
        `&product=HOME_DELIVERY` +
        `&customerNumber=${customerNumber}`,
    );
    return res.available === true;
  } catch (err) {
    console.error(
      "[Instabee] validatePostalCode failed:",
      postalCode,
      err,
    );
    // Vid fel: tillåt checkout att fortsätta
    return true;
  }
}

export async function createInstabeeOrder(
  params: InstabeeHomeDeliveryOrderParams,
): Promise<void> {
  const customerNumber = getCustomerNumber();
  await instabeeRequest<InstabeeOrderResponse>("/orders", {
    method: "PUT",
    body: JSON.stringify({
      brand: "Budbee",
      product: "HOME_DELIVERY",
      countryCode: params.countryCode,
      customerNumber,
      orderId: params.orderId,
      recipient: {
        name: params.recipientName,
        email: params.recipientEmail,
        phone: params.recipientPhone,
        street: params.street,
        postalCode: params.postalCode,
        city: params.city,
        countryCode: params.countryCode,
      },
      cart: {
        orderNumber: params.orderId,
        parcel: {
          estimatedSize: params.totalBottles <= 6 ? "small" : "medium",
        },
      },
    }),
  });
  console.log(
    `[Instabee] Post Purchase created orderId=${params.orderId}`,
  );
}

export async function confirmInstabeePacking(
  params: InstabeeHomeDeliveryOrderParams & {
    totalWeightGram: number;
  },
): Promise<InstabeePackingResult | null> {
  try {
    const customerNumber = getCustomerNumber();
    const res = await instabeeRequest<InstabeeOrderResponse>("/orders", {
      method: "PUT",
      body: JSON.stringify({
        brand: "Budbee",
        product: "HOME_DELIVERY",
        countryCode: params.countryCode,
        customerNumber,
        orderId: params.orderId,
        parcelPackingConfirmed: true,
        recipient: {
          name: params.recipientName,
          email: params.recipientEmail,
          phone: params.recipientPhone,
          street: params.street,
          postalCode: params.postalCode,
          city: params.city,
          countryCode: params.countryCode,
        },
        cart: {
          orderNumber: params.orderId,
          totalWeightGram: params.totalWeightGram,
          parcel: {
            estimatedSize: params.totalBottles <= 6 ? "small" : "medium",
            type: "box",
          },
        },
      }),
    });

    console.log(
      `[Instabee] Post Packing confirmed orderId=${params.orderId}`,
    );

    return {
      parcelId: res.parcelId ?? params.orderId,
      labelUrl: res.links?.label ?? null,
      trackingUrl: res.links?.tracking ?? null,
    };
  } catch (err) {
    console.error(
      "[Instabee] confirmInstabeePacking failed:",
      params.orderId,
      err,
    );
    return null;
  }
}
