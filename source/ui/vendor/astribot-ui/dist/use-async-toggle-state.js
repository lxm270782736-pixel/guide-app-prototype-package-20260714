import * as React from "react";
function useAsyncToggleState({ checked, onCheckedChange, }) {
    const [optimisticChecked, setOptimisticChecked] = React.useState(null);
    const [pending, setPending] = React.useState(false);
    React.useEffect(() => {
        setOptimisticChecked((current) => {
            if (current === null) {
                return null;
            }
            return current === checked ? null : current;
        });
    }, [checked]);
    const displayChecked = optimisticChecked ?? checked;
    const handleCheckedChange = React.useCallback(async (nextChecked) => {
        if (pending) {
            return;
        }
        setPending(true);
        try {
            await onCheckedChange(nextChecked);
            setOptimisticChecked(nextChecked);
        }
        finally {
            setPending(false);
        }
    }, [onCheckedChange, pending]);
    return {
        checked: displayChecked,
        pending,
        onCheckedChange: handleCheckedChange,
    };
}
export { useAsyncToggleState };
