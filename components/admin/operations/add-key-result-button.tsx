"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { KeyResultFormDialog } from "./key-result-form-dialog"

interface Props {
  objective_id: string
}

export function AddKeyResultButton({ objective_id }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Key Result
      </Button>
      <KeyResultFormDialog
        open={open}
        onOpenChange={setOpen}
        objective_id={objective_id}
      />
    </>
  )
}
