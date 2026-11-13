import { permanentRedirect } from "next/navigation";

interface OrderRedirectPageProps {
  params: Promise<{ id: string }>;
}

/** Legacy path — B2C order detail lives under /admin/b2c-orders/[id]. */
export default async function OrderDetailsRedirectPage({
  params,
}: OrderRedirectPageProps) {
  const { id } = await params;
  permanentRedirect(`/admin/b2c-orders/${id}`);
}
