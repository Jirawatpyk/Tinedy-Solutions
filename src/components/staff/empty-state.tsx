import { memo } from 'react'
import { Calendar, Briefcase, CheckCircle, Sparkles } from 'lucide-react'

export type EmptyStateType = 'today' | 'upcoming' | 'past'

interface EmptyStateProps {
  type: EmptyStateType
}

export const EmptyState = memo(function EmptyState({ type }: EmptyStateProps) {
  const config = {
    today: {
      icon: Calendar,
      title: 'No tasks today',
      message: 'Enjoy your day off! 🎉',
      gradient: 'from-blue-500/10 to-cyan-500/10',
      iconColor: 'text-blue-500'
    },
    upcoming: {
      icon: Briefcase,
      title: 'No upcoming tasks',
      message: 'No tasks scheduled in the next 7 days',
      gradient: 'from-purple-500/10 to-pink-500/10',
      iconColor: 'text-purple-500'
    },
    past: {
      icon: CheckCircle,
      title: 'No past tasks',
      message: 'No completed tasks in the last 30 days',
      gradient: 'from-green-500/10 to-emerald-500/10',
      iconColor: 'text-green-500'
    }
  }

  const { icon: Icon, title, message, gradient, iconColor } = config[type]

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border border-gray-200/50 p-8 sm:p-12 text-center`}>
      {/* Decorative elements */}
      <div className="absolute top-4 right-4 opacity-10">
        <Sparkles className="h-12 w-12 text-primary" />
      </div>
      <div className="absolute bottom-4 left-4 opacity-10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className={`relative rounded-full bg-gradient-to-br from-white to-white/50 p-6 shadow-lg`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 blur-xl" />
          <Icon className={`relative h-12 w-12 sm:h-16 sm:w-16 ${iconColor}`} />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
        {message}
      </p>
    </div>
  )
})
