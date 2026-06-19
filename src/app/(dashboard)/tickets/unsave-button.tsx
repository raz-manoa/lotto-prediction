"use client";

import { unsaveTicket } from "@/lib/actions/predictions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function UnsaveButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();

  async function handleUnsave() {
    if (!confirm("Retirer ce ticket de la liste ?")) return;
    await unsaveTicket(ticketId);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleUnsave}>
      Retirer
    </Button>
  );
}
