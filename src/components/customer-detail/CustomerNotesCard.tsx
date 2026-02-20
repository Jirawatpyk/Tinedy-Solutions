import { memo } from 'react'
import { FileText, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CustomerNotesCardProps {
  notes: string | null | undefined
  onAddNote: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomerNotesCard = memo(function CustomerNotesCard({
  notes,
  onAddNote,
}: CustomerNotesCardProps) {
  // Split [Auto] activity notes from manual notes
  const noteBlocks = (notes || '').split('\n\n').map((n) => n.trim()).filter(Boolean)
  const autoNotes = noteBlocks.filter((n) => n.startsWith('[Auto]'))
  const manualNotes = noteBlocks.filter((n) => !n.startsWith('[Auto]'))

  const isEmpty = noteBlocks.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-tinedy-dark">
            <FileText className="h-4 w-4 text-tinedy-blue" />
            Notes & Activity
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onAddNote} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Note
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty && (
          <p className="text-sm text-muted-foreground">
            No notes yet. Click "Add Note" to add one.
          </p>
        )}

        {/* Manual Notes */}
        {manualNotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </p>
            <div className="bg-muted/40 rounded-lg p-3 space-y-2">
              {manualNotes.map((note, i) => (
                <p key={i} className="text-sm text-tinedy-dark whitespace-pre-wrap">
                  {note}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Auto Activity Log */}
        {autoNotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Auto Activity Log
            </p>
            <div className="space-y-1">
              {autoNotes.map((note, i) => (
                <p
                  key={i}
                  className="text-xs text-muted-foreground font-mono bg-muted/30 rounded px-2.5 py-1.5"
                >
                  {note}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

CustomerNotesCard.displayName = 'CustomerNotesCard'

export default CustomerNotesCard
