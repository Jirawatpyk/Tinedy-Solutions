import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SimpleTabs as Tabs, SimpleTabsContent as TabsContent, SimpleTabsList as TabsList, SimpleTabsTrigger as TabsTrigger } from '@/components/ui/simple-tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useSettings } from '@/hooks/use-settings'
import { getErrorMessage } from '@/lib/error-utils'
import {
  Building2,
  Clock,
  Bell,
  Save,
  Upload,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AdminSettings() {
  const { toast } = useToast()
  const { settings, loading, error, updateGeneralSettings, updateBookingSettings, updateNotificationSettings } = useSettings()
  const [saving, setSaving] = useState(false)

  // General Settings State
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')

  // Booking Settings State
  const [timeSlotDuration, setTimeSlotDuration] = useState('60')
  const [minAdvanceBooking, setMinAdvanceBooking] = useState('24')
  const [maxBookingWindow, setMaxBookingWindow] = useState('60')
  const [cancellationHours, setCancellationHours] = useState('24')
  const [requireDeposit, setRequireDeposit] = useState(false)
  const [depositPercentage, setDepositPercentage] = useState('30')

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [notifyNewBooking, setNotifyNewBooking] = useState(true)
  const [notifyCancellation, setNotifyCancellation] = useState(true)
  const [notifyPayment, setNotifyPayment] = useState(true)
  const [reminderHours, setReminderHours] = useState('24')

  // Load settings from database
  useEffect(() => {
    if (settings) {
      // General
      setBusinessName(settings.business_name)
      setBusinessEmail(settings.business_email)
      setBusinessPhone(settings.business_phone)
      setBusinessAddress(settings.business_address)
      setBusinessDescription(settings.business_description || '')

      // Booking
      setTimeSlotDuration(String(settings.time_slot_duration))
      setMinAdvanceBooking(String(settings.min_advance_booking))
      setMaxBookingWindow(String(settings.max_booking_window))
      setCancellationHours(String(settings.cancellation_hours))
      setRequireDeposit(settings.require_deposit)
      setDepositPercentage(String(settings.deposit_percentage))

      // Notifications
      setEmailNotifications(settings.email_notifications)
      setSmsNotifications(settings.sms_notifications)
      setNotifyNewBooking(settings.notify_new_booking)
      setNotifyCancellation(settings.notify_cancellation)
      setNotifyPayment(settings.notify_payment)
      setReminderHours(String(settings.reminder_hours))
    }
  }, [settings])

  const handleSaveGeneral = async () => {
    try {
      setSaving(true)
      await updateGeneralSettings({
        business_name: businessName,
        business_email: businessEmail,
        business_phone: businessPhone,
        business_address: businessAddress,
        business_description: businessDescription || undefined,
      })

      toast({
        title: 'Success',
        description: 'General settings saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBooking = async () => {
    try {
      setSaving(true)
      await updateBookingSettings({
        time_slot_duration: parseInt(timeSlotDuration),
        min_advance_booking: parseInt(minAdvanceBooking),
        max_booking_window: parseInt(maxBookingWindow),
        cancellation_hours: parseInt(cancellationHours),
        require_deposit: requireDeposit,
        deposit_percentage: parseInt(depositPercentage),
      })

      toast({
        title: 'Success',
        description: 'Booking settings saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setSaving(true)
      await updateNotificationSettings({
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        notify_new_booking: notifyNewBooking,
        notify_cancellation: notifyCancellation,
        notify_payment: notifyPayment,
        reminder_hours: parseInt(reminderHours),
      })

      toast({
        title: 'Success',
        description: 'Notification settings saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Show error if settings fail to load
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="px-4 sm:px-6 py-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error loading settings: {error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Show loading skeleton while settings load
  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="px-4 sm:px-6 py-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your business settings and preferences
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Booking</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Update your business details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Logo */}
                <div className="space-y-2">
                  <Label>Business Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-tinedy-blue via-tinedy-green to-tinedy-yellow rounded-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">T</span>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended size: 200x200px, Max 2MB (JPG, PNG, WEBP)
                  </p>
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter business name"
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Business Email *
                    </Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Business Phone *
                    </Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="02-XXX-XXXX"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="businessAddress" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Business Address *
                  </Label>
                  <Textarea
                    id="businessAddress"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Enter full business address"
                    rows={3}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description</Label>
                  <Textarea
                    id="businessDescription"
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="Brief description of your business"
                    rows={3}
                  />
                </div>

                <Button onClick={handleSaveGeneral} disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save General Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking Settings */}
          <TabsContent value="booking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Booking Configuration
                </CardTitle>
                <CardDescription>
                  Configure booking time slots and policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Time Slot Duration */}
                <div className="space-y-2">
                  <Label htmlFor="timeSlotDuration">Time Slot Duration</Label>
                  <Select value={timeSlotDuration} onValueChange={setTimeSlotDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Default duration for booking time slots
                  </p>
                </div>

                {/* Advance Booking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minAdvanceBooking">Minimum Advance Booking</Label>
                    <Select value={minAdvanceBooking} onValueChange={setMinAdvanceBooking}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours (1 day)</SelectItem>
                        <SelectItem value="48">48 hours (2 days)</SelectItem>
                        <SelectItem value="72">72 hours (3 days)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How far in advance customers must book
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxBookingWindow">Maximum Booking Window</Label>
                    <Select value={maxBookingWindow} onValueChange={setMaxBookingWindow}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days (1 month)</SelectItem>
                        <SelectItem value="60">60 days (2 months)</SelectItem>
                        <SelectItem value="90">90 days (3 months)</SelectItem>
                        <SelectItem value="180">180 days (6 months)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How far ahead customers can book
                    </p>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="space-y-2">
                  <Label htmlFor="cancellationHours">Free Cancellation Period</Label>
                  <Select value={cancellationHours} onValueChange={setCancellationHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour before</SelectItem>
                      <SelectItem value="2">2 hours before</SelectItem>
                      <SelectItem value="4">4 hours before</SelectItem>
                      <SelectItem value="12">12 hours before</SelectItem>
                      <SelectItem value="24">24 hours before (1 day)</SelectItem>
                      <SelectItem value="48">48 hours before (2 days)</SelectItem>
                      <SelectItem value="72">72 hours before (3 days)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Customers can cancel for free up to this time before the booking
                  </p>
                </div>

                {/* Deposit Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Deposit</Label>
                      <p className="text-xs text-muted-foreground">
                        Require customers to pay a deposit when booking
                      </p>
                    </div>
                    <Switch checked={requireDeposit} onCheckedChange={setRequireDeposit} />
                  </div>

                  {requireDeposit && (
                    <div className="space-y-2 pl-4 border-l-2 border-tinedy-blue">
                      <Label htmlFor="depositPercentage">Deposit Percentage</Label>
                      <Select value={depositPercentage} onValueChange={setDepositPercentage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="20">20%</SelectItem>
                          <SelectItem value="30">30%</SelectItem>
                          <SelectItem value="50">50%</SelectItem>
                          <SelectItem value="100">100% (Full payment)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These settings will apply to all new bookings. Existing bookings will not be affected.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleSaveBooking} disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Booking Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Channels */}
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Channels</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        SMS Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications via SMS (additional charges may apply)
                      </p>
                    </div>
                    <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
                  </div>
                </div>

                {/* Notification Types */}
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Types</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Booking</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when a new booking is created
                      </p>
                    </div>
                    <Switch checked={notifyNewBooking} onCheckedChange={setNotifyNewBooking} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Booking Cancellation</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when a booking is cancelled
                      </p>
                    </div>
                    <Switch checked={notifyCancellation} onCheckedChange={setNotifyCancellation} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payment Received</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when a payment is received
                      </p>
                    </div>
                    <Switch checked={notifyPayment} onCheckedChange={setNotifyPayment} />
                  </div>
                </div>

                {/* Booking Reminders */}
                <div className="space-y-2">
                  <Label htmlFor="reminderHours">Booking Reminder</Label>
                  <Select value={reminderHours} onValueChange={setReminderHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour before</SelectItem>
                      <SelectItem value="2">2 hours before</SelectItem>
                      <SelectItem value="4">4 hours before</SelectItem>
                      <SelectItem value="12">12 hours before</SelectItem>
                      <SelectItem value="24">24 hours before (1 day)</SelectItem>
                      <SelectItem value="48">48 hours before (2 days)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Send reminder notifications to customers before their booking
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Notification settings apply to both admin and customer notifications.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleSaveNotifications} disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
