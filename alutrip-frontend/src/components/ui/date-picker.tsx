import * as React from "react"
import ReactDatePicker, { registerLocale } from "react-datepicker"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import "react-datepicker/dist/react-datepicker.css"

registerLocale("pt-BR", ptBR)

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({ date, onDateChange, placeholder = "Selecione uma data", disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const CustomInput = React.forwardRef<HTMLInputElement, any>(({ value, onClick }, ref) => (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        placeholder={placeholder}
        value={value || ""}
        onClick={onClick}
        readOnly
        disabled={disabled}
        className="pr-10 cursor-pointer"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={onClick}
        disabled={disabled}
      >
        <CalendarIcon className="h-4 w-4" />
      </Button>
    </div>
  ))

  CustomInput.displayName = "CustomInput"

  return (
    <div className="relative w-full">
      <ReactDatePicker
        selected={date}
        onChange={(date: Date | null) => onDateChange?.(date || undefined)}
        dateFormat="dd/MM/yyyy"
        locale="pt-BR"
        customInput={<CustomInput />}
        disabled={disabled}
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        onInputClick={() => !disabled && setIsOpen(true)}
        className={cn(
          "react-datepicker-wrapper w-full"
        )}
        calendarClassName={cn(
          "react-datepicker-custom",
          "!bg-popover !border-border !text-foreground",
          "!font-sans !text-sm"
        )}
        dayClassName={() => cn(
          "react-datepicker__day-custom",
          "!text-foreground hover:!bg-accent hover:!text-accent-foreground",
          "!rounded-md !mx-0.5 !my-0.5"
        )}
        weekDayClassName={() => cn(
          "react-datepicker__day-name-custom",
          "!text-muted-foreground !font-normal"
        )}
        monthClassName={() => cn(
          "react-datepicker__month-custom",
          "!text-foreground"
        )}
        timeClassName={() => cn(
          "react-datepicker__time-custom",
          "!text-foreground"
        )}
        previousMonthButtonLabel="‹"
        nextMonthButtonLabel="›"
        showPopperArrow={false}
        popperClassName="react-datepicker-popper-custom"
        popperPlacement="bottom-start"
      />
      
      <style>{`
        .react-datepicker-wrapper {
          width: 100% !important;
          display: block !important;
        }
        
        .react-datepicker__input-container {
          width: 100% !important;
          display: block !important;
        }
        
        .react-datepicker-popper-custom {
          z-index: 50;
        }
        
        .react-datepicker-custom {
          background-color: hsl(var(--popover)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          font-family: 'Inter', sans-serif !important;
        }
        
        .react-datepicker__header {
          background-color: hsl(var(--popover)) !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .react-datepicker__current-month {
          color: hsl(var(--foreground)) !important;
          font-weight: 500 !important;
        }
        
        .react-datepicker__day-name {
          color: hsl(var(--muted-foreground)) !important;
          font-weight: normal !important;
        }
        
        .react-datepicker__day {
          color: hsl(var(--foreground)) !important;
          border-radius: 0.375rem !important;
          margin: 0.125rem !important;
        }
        
        .react-datepicker__day:hover {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
        }
        
        .react-datepicker__day--selected {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        
        .react-datepicker__day--selected:hover {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        
        .react-datepicker__day--today {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
        }
        
        .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground)) !important;
          opacity: 0.5 !important;
        }
        
        .react-datepicker__navigation {
          border: none !important;
          background: none !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .react-datepicker__navigation:hover {
          background-color: hsl(var(--accent)) !important;
          border-radius: 0.375rem !important;
        }
        
        .react-datepicker__navigation--previous {
          left: 8px !important;
        }
        
        .react-datepicker__navigation--next {
          right: 8px !important;
        }
        
        .react-datepicker__triangle {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
