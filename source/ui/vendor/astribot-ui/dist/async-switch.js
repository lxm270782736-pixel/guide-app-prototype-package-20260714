import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Switch } from "./switch";
const AsyncSwitch = React.forwardRef(({ checked, disabled, onCheckedChange, ...props }, ref) => {
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
    const handleCheckedChange = async (nextChecked) => {
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
    };
    return (_jsx(Switch, { ...props, ref: ref, checked: displayChecked, disabled: disabled || pending, onCheckedChange: handleCheckedChange }));
});
AsyncSwitch.displayName = "AsyncSwitch";
export { AsyncSwitch };
