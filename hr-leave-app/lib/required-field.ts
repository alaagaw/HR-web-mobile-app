// Universal mandatory-field visual for MUI fields (the web/dialog
// counterpart of the `required` prop on components/ui/input.tsx).
//
// Drop `sx={requiredSx(value)}` on any required <TextField> /
// <Autocomplete>'s renderInput TextField: red outline while empty,
// green once filled. `hasError` (a real submitted/validation error)
// forces red regardless.
//
// Keeps the two form stacks visually consistent (RN Input red/green
// ↔ MUI red/green) per the forms-revamp R3 requirement.

const RED = '#EF4444';
const GREEN = '#16A34A';

export function requiredSx(value: unknown, hasError = false) {
  const filled =
    value != null && String(value).trim().length > 0;
  const color = hasError || !filled ? RED : GREEN;
  return {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: color,
    },
  };
}
