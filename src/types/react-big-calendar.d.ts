 
declare module 'react-big-calendar' {
  import { ComponentType } from 'react'

  export type View = 'month' | 'week' | 'day' | 'agenda'
  export type Navigate = 'PREV' | 'NEXT' | 'TODAY' | 'DATE'

  export interface Event {
    title: string
    start: Date
    end: Date
    allDay?: boolean
    resource?: any
  }

  export interface CalendarProps<TEvent extends Event = Event, TResource = any> {
    localizer: any
    events?: TEvent[]
    startAccessor?: keyof TEvent | ((event: TEvent) => Date)
    endAccessor?: keyof TEvent | ((event: TEvent) => Date)
    titleAccessor?: keyof TEvent | ((event: TEvent) => string)
    resourceAccessor?: keyof TEvent | ((event: TEvent) => TResource)
    allDayAccessor?: keyof TEvent | ((event: TEvent) => boolean)
    style?: React.CSSProperties
    className?: string
    view?: View
    views?: View[] | { [key: string]: boolean | ComponentType }
    date?: Date
    defaultView?: View
    onNavigate?: (date: Date, view: View, action: Navigate) => void
    onView?: (view: View) => void
    onSelectEvent?: (event: TEvent, e: React.SyntheticEvent) => void
    onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void
    onDoubleClickEvent?: (event: TEvent, e: React.SyntheticEvent) => void
    eventPropGetter?: (event: TEvent) => { className?: string; style?: React.CSSProperties }
    slotPropGetter?: (date: Date) => { className?: string; style?: React.CSSProperties }
    dayPropGetter?: (date: Date) => { className?: string; style?: React.CSSProperties }
    components?: {
      event?: ComponentType<{ event: TEvent }>
      toolbar?: ComponentType<any>
      agenda?: { event?: ComponentType<any> }
      day?: { event?: ComponentType<any> }
      week?: { event?: ComponentType<any> }
      month?: { event?: ComponentType<any> }
    }
    messages?: {
      allDay?: string
      previous?: string
      next?: string
      today?: string
      month?: string
      week?: string
      day?: string
      agenda?: string
      date?: string
      time?: string
      event?: string
      noEventsInRange?: string
      showMore?: (total: number) => string
    }
    formats?: any
    culture?: string
    min?: Date
    max?: Date
    scrollToTime?: Date
    step?: number
    timeslots?: number
    popup?: boolean
    popupOffset?: number | { x: number; y: number }
    selectable?: boolean | 'ignoreEvents'
    longPressThreshold?: number
    drilldownView?: View | null
    getDrilldownView?: (date: Date, view: View) => View | null
  }

  export class Calendar<TEvent extends Event = Event, TResource = any> extends React.Component<
    CalendarProps<TEvent, TResource>
  > {}

  export function dateFnsLocalizer(config: {
    format: (date: Date, format: string, options?: any) => string
    parse: (dateString: string, format: string, referenceDate: Date, options?: any) => Date
    startOfWeek: (date: Date, options?: any) => Date
    getDay: (date: Date) => number
    locales?: { [key: string]: any }
  }): any

  export function momentLocalizer(moment: any): any
  export function globalizeLocalizer(globalize: any): any
}

declare module 'react-big-calendar/lib/css/react-big-calendar.css'
