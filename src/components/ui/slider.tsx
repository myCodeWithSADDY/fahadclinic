"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "tailwind-merge:relative tailwind-merge:flex tailwind-merge:w-full tailwind-merge:touch-none tailwind-merge:items-center tailwind-merge:select-none tailwind-merge:data-disabled:opacity-50 tailwind-merge:data-vertical:h-full tailwind-merge:data-vertical:min-h-40 tailwind-merge:data-vertical:w-auto tailwind-merge:data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="tailwind-merge:relative tailwind-merge:grow tailwind-merge:overflow-hidden tailwind-merge:rounded-full tailwind-merge:bg-muted tailwind-merge:data-horizontal:h-1 tailwind-merge:data-horizontal:w-full tailwind-merge:data-vertical:h-full tailwind-merge:data-vertical:w-1"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="tailwind-merge:absolute tailwind-merge:bg-primary tailwind-merge:select-none tailwind-merge:data-horizontal:h-full tailwind-merge:data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="tailwind-merge:relative tailwind-merge:block tailwind-merge:size-3 tailwind-merge:shrink-0 tailwind-merge:rounded-full tailwind-merge:border tailwind-merge:border-ring tailwind-merge:bg-white tailwind-merge:ring-ring/50 tailwind-merge:transition-[color,box-shadow] tailwind-merge:select-none tailwind-merge:after:absolute tailwind-merge:after:-inset-2 tailwind-merge:hover:ring-3 tailwind-merge:focus-visible:ring-3 tailwind-merge:focus-visible:outline-hidden tailwind-merge:active:ring-3 tailwind-merge:disabled:pointer-events-none tailwind-merge:disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
