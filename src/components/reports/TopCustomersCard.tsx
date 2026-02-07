import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Calendar, TrendingUp } from 'lucide-react'
import {
  formatCurrency,
  formatDate,
  getAvatarColor,
  getRankBadgeColor,
} from '@/lib/utils'
import { getInitials } from '@/lib/string-utils'

interface TopCustomer {
  id: string
  name: string
  email: string
  totalBookings: number
  totalRevenue: number
  lastBookingDate: string
}

interface TopCustomersCardProps {
  customers: TopCustomer[]
}

export function TopCustomersCard({ customers }: TopCustomersCardProps) {
  if (customers.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No customer data available
      </div>
    )
  }

  return (
    <>
      {/* Mobile View - Card Layout */}
      <div className="lg:hidden space-y-3">
        {customers.map((customer, index) => (
          <Card key={customer.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadgeColor(index)}`}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Avatar */}
                <Avatar className="flex-shrink-0 h-12 w-12">
                  <AvatarImage src={undefined} alt={customer.name} />
                  <AvatarFallback className={`${getAvatarColor(index)} text-white font-semibold`}>
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base text-tinedy-dark truncate">
                    {customer.name}
                  </h4>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* Revenue */}
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-medium">Revenue</span>
                      </div>
                      <div className="font-bold text-sm text-green-800">
                        {formatCurrency(customer.totalRevenue)}
                      </div>
                    </div>

                    {/* Bookings */}
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-xs text-blue-700 font-medium mb-1">
                        Bookings
                      </div>
                      <div className="font-bold text-sm text-blue-800">
                        {customer.totalBookings} jobs
                      </div>
                    </div>
                  </div>

                  {/* Last Booking */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3" />
                    <span>Last: {formatDate(customer.lastBookingDate)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop View - Table Layout */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left">
              <th className="pb-3 font-semibold text-sm text-muted-foreground whitespace-nowrap">
                #
              </th>
              <th className="pb-3 font-semibold text-sm text-muted-foreground whitespace-nowrap">
                Customer
              </th>
              <th className="pb-3 font-semibold text-sm text-muted-foreground whitespace-nowrap">
                Email
              </th>
              <th className="pb-3 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
                Total Bookings
              </th>
              <th className="pb-3 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
                Total Revenue
              </th>
              <th className="pb-3 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
                Last Booking
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr key={customer.id} className="border-b hover:bg-accent/20 transition-colors">
                <td className="py-3 text-sm whitespace-nowrap">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${getRankBadgeColor(index)}`}
                  >
                    {index + 1}
                  </div>
                </td>
                <td className="py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={undefined} alt={customer.name} />
                      <AvatarFallback className={`${getAvatarColor(index)} text-white font-semibold text-sm`}>
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{customer.name}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </div>
                </td>
                <td className="py-3 text-sm text-right whitespace-nowrap">
                  {customer.totalBookings}
                </td>
                <td className="py-3 text-sm font-semibold text-right text-tinedy-dark whitespace-nowrap">
                  {formatCurrency(customer.totalRevenue)}
                </td>
                <td className="py-3 text-sm text-muted-foreground text-right whitespace-nowrap">
                  {formatDate(customer.lastBookingDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
