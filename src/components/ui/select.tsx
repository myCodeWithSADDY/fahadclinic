"use client"

import * as React from "react"
import { cn } from "cn"
import { Select as SelectPrimitive } from "radix-ui"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("tailwind-merge:scroll-my-1 tailwind-merge:p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "tailwind-merge:flex tailwind-merge:w-fit tailwind-merge:items-center tailwind-merge:justify-between tailwind-merge:gap-1.5 tailwind-merge:rounded-lg tailwind-merge:border tailwind-merge:border-input tailwind-merge:bg-transparent tailwind-merge:py-2 tailwind-merge:pr-2 tailwind-merge:pl-2.5 tailwind-merge:text-sm tailwind-merge:whitespace-nowrap tailwind-merge:transition-colors tailwind-merge:outline-none tailwind-merge:select-none tailwind-merge:focus-visible:border-ring tailwind-merge:focus-visible:ring-3 tailwind-merge:focus-visible:ring-ring/50 tailwind-merge:disabled:cursor-not-allowed tailwind-merge:disabled:opacity-50 tailwind-merge:aria-invalid:border-destructive tailwind-merge:aria-invalid:ring-3 tailwind-merge:aria-invalid:ring-destructive/20 tailwind-merge:data-placeholder:text-muted-foreground tailwind-merge:data-[size=default]:h-8 tailwind-merge:data-[size=sm]:h-7 tailwind-merge:data-[size=sm]:rounded-[min(var(--radius-md),10px)] tailwind-merge:*:data-[slot=select-value]:line-clamp-1 tailwind-merge:*:data-[slot=select-value]:flex tailwind-merge:*:data-[slot=select-value]:items-center tailwind-merge:*:data-[slot=select-value]:gap-1.5 tailwind-merge:dark:bg-input/30 tailwind-merge:dark:hover:bg-input/50 tailwind-merge:dark:aria-invalid:border-destructive/50 tailwind-merge:dark:aria-invalid:ring-destructive/40 tailwind-merge:[&_svg]:pointer-events-none tailwind-merge:[&_svg]:shrink-0 tailwind-merge:[&_svg:not([class*=size-])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="tailwind-merge:pointer-events-none tailwind-merge:size-4 tailwind-merge:text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn("tailwind-merge: tailwind-merge: tailwind-merge:relative tailwind-merge:z-50 tailwind-merge:max-h-(--radix-select-content-available-height) tailwind-merge:min-w-36 tailwind-merge:origin-(--radix-select-content-transform-origin) tailwind-merge:overflow-x-hidden tailwind-merge:overflow-y-auto tailwind-merge:rounded-lg tailwind-merge:bg-popover tailwind-merge:text-popover-foreground tailwind-merge:shadow-md tailwind-merge:ring-1 tailwind-merge:ring-foreground/10 tailwind-merge:duration-100 tailwind-merge:data-[align-trigger=true]:animate-none tailwind-merge:data-[side=bottom]:slide-in-from-top-2 tailwind-merge:data-[side=left]:slide-in-from-right-2 tailwind-merge:data-[side=right]:slide-in-from-left-2 tailwind-merge:data-[side=top]:slide-in-from-bottom-2 tailwind-merge:data-open:animate-in tailwind-merge:data-open:fade-in-0 tailwind-merge:data-open:zoom-in-95 tailwind-merge:data-closed:animate-out tailwind-merge:data-closed:fade-out-0 tailwind-merge:data-closed:zoom-out-95", position ==="popper"&&"tailwind-merge:data-[side=bottom]:translate-y-1 tailwind-merge:data-[side=left]:-translate-x-1 tailwind-merge:data-[side=right]:translate-x-1 tailwind-merge:data-[side=top]:-translate-y-1", className )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            "tailwind-merge:data-[position=popper]:h-(--radix-select-trigger-height) tailwind-merge:data-[position=popper]:w-full tailwind-merge:data-[position=popper]:min-w-(--radix-select-trigger-width)",
            position === "popper" && "tailwind-merge:"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("tailwind-merge:px-1.5 tailwind-merge:py-1 tailwind-merge:text-xs tailwind-merge:text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "tailwind-merge:relative tailwind-merge:flex tailwind-merge:w-full tailwind-merge:cursor-default tailwind-merge:items-center tailwind-merge:gap-1.5 tailwind-merge:rounded-md tailwind-merge:py-1 tailwind-merge:pr-8 tailwind-merge:pl-1.5 tailwind-merge:text-sm tailwind-merge:outline-hidden tailwind-merge:select-none tailwind-merge:focus:bg-accent tailwind-merge:focus:text-accent-foreground tailwind-merge:not-data-[variant=destructive]:focus:**:text-accent-foreground tailwind-merge:data-disabled:pointer-events-none tailwind-merge:data-disabled:opacity-50 tailwind-merge:[&_svg]:pointer-events-none tailwind-merge:[&_svg]:shrink-0 tailwind-merge:[&_svg:not([class*=size-])]:size-4 tailwind-merge:*:[span]:last:flex tailwind-merge:*:[span]:last:items-center tailwind-merge:*:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="tailwind-merge:pointer-events-none tailwind-merge:absolute tailwind-merge:right-2 tailwind-merge:flex tailwind-merge:size-4 tailwind-merge:items-center tailwind-merge:justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="tailwind-merge:pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("tailwind-merge:pointer-events-none tailwind-merge:-mx-1 tailwind-merge:my-1 tailwind-merge:h-px tailwind-merge:bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "tailwind-merge:z-10 tailwind-merge:flex tailwind-merge:cursor-default tailwind-merge:items-center tailwind-merge:justify-center tailwind-merge:bg-popover tailwind-merge:py-1 tailwind-merge:[&_svg:not([class*=size-])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "tailwind-merge:z-10 tailwind-merge:flex tailwind-merge:cursor-default tailwind-merge:items-center tailwind-merge:justify-center tailwind-merge:bg-popover tailwind-merge:py-1 tailwind-merge:[&_svg:not([class*=size-])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
