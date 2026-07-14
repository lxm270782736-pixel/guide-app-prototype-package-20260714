import * as React from "react"

type UseAsyncToggleStateOptions = {
  checked: boolean
  onCheckedChange: (checked: boolean) => Promise<unknown> | unknown
}

function useAsyncToggleState({
  checked,
  onCheckedChange,
}: UseAsyncToggleStateOptions) {
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

  const handleCheckedChange = React.useCallback(
    async (nextChecked: boolean) => {
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
    },
    [onCheckedChange, pending]
  )

  return {
    checked: displayChecked,
    pending,
    onCheckedChange: handleCheckedChange,
  }
}

export { useAsyncToggleState }
