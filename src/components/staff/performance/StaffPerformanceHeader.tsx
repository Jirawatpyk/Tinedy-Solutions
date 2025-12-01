import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  phone?: string
  avatar_url?: string
}

interface StaffPerformanceHeaderProps {
  staff: Staff
  basePath: string
}

export const StaffPerformanceHeader = memo(function StaffPerformanceHeader({ staff, basePath }: StaffPerformanceHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(`${basePath}/staff`)}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-4 flex-1">
        <div className="w-16 h-16 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-2xl">
          {staff.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">
            {staff.full_name}
          </h1>
          <p className="text-muted-foreground">{staff.role} • {staff.email}</p>
        </div>
      </div>
    </div>
  )
})
