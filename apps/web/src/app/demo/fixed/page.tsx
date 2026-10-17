import Checkout from "../Checkout";

export const metadata = { title: "고친 결제 화면 데모 — Stuckpoint" };

export default async function FixedDemoPage({ searchParams }: { searchParams: Promise<{ embed?: string }> }) {
  const { embed } = await searchParams;
  return <Checkout fixed embed={embed === "1"} />;
}
