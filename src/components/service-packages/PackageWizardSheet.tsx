import { useState } from 'react'
import { AppSheet } from '@/components/ui/app-sheet'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { PackageWizard } from './PackageWizard'

interface PackageWizardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PackageWizardSheet({
  open,
  onOpenChange,
  onSuccess,
}: PackageWizardSheetProps) {
  const [isDirty, setIsDirty] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    if (!nextOpen) {
      setIsDirty(false)
    }
    onOpenChange(nextOpen)
  }

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false)
    setIsDirty(false)
    onOpenChange(false)
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={handleOpenChange}
        title="New Package"
        description="Create a new service package"
        size="lg"
      >
        <PackageWizard
          onSuccess={() => {
            setIsDirty(false)
            onOpenChange(false)
            onSuccess()
          }}
          onCancel={() => onOpenChange(false)}
          onDirtyChange={setIsDirty}
        />
      </AppSheet>

      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to close?"
        variant="warning"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={handleDiscardConfirm}
      />
    </>
  )
}
