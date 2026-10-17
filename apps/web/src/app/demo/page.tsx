import Checkout from "./Checkout";

export const metadata = { title: "불편한 결제 화면 데모 — Stuckpoint" };

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ embed?: string }> }) {
  const { embed } = await searchParams;
  return <Checkout embed={embed === "1"} />;
}
