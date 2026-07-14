type UseAsyncToggleStateOptions = {
    checked: boolean;
    onCheckedChange: (checked: boolean) => Promise<unknown> | unknown;
};
declare function useAsyncToggleState({ checked, onCheckedChange, }: UseAsyncToggleStateOptions): {
    checked: boolean;
    pending: boolean;
    onCheckedChange: (nextChecked: boolean) => Promise<void>;
};
export { useAsyncToggleState };
//# sourceMappingURL=use-async-toggle-state.d.ts.map