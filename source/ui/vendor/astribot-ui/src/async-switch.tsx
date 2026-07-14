import * as React from "react"

import { Switch } from "./switch"

type AsyncSwitchProps = Omit<
  React.ComponentPropsWithoutRef<typeof Switch>,
  "checked" | "defaultChecked" | "onCheckedChange"
> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => Promise<unknown> | unknown
}

const AsyncSwitch = React.forwardRef<
  React.ElementRef<typeof Switch>,
  AsyncSwitchProps
>(({ checked, disabled, onCheckedChange, ...props }, ref) => {
  const [optimisticChecked, setOptimisticChecked] = React.useState<boolean | null>(null)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setOptimisticChecked((current) => {
      if (current === null) {
        return null
      }
      return current === checked ? null : current
    })
  }, [checked])

  const displayChecked = optimisticChecked ?? checked

  const handleCheckedChange = async (nextChecked: boolean) => {
    if (pending) {
      return
    }
    setPending(true)
    try {
      await onCheckedChange(nextChecked)
      setOptimisticChecked(nextChecked)
    } finally {
      setPending(false)
    }
  }

  return (
    <Switch
      {...props}
      ref={ref}
      checked={displayChecked}
      disabled={disabled || pending}
      onCheckedChange={handleCheckedChange}
    />
  )
})

AsyncSwitch.displayName = "AsyncSwitch"

export { AsyncSwitch }
