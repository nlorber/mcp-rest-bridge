/**
 * Pick only the allowed fields from an object.
 * Supports dot-notation for nested fields (e.g. "address.city").
 */
export function pickFields(
  obj: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const dotIndex = field.indexOf(".");
    if (dotIndex === -1) {
      // Top-level field
      if (field in obj) {
        result[field] = obj[field];
      }
    } else {
      // Nested field: "parent.child"
      const topKey = field.slice(0, dotIndex);
      const subKey = field.slice(dotIndex + 1);
      const nested = obj[topKey];

      if (nested != null && typeof nested === "object") {
        if (!(topKey in result)) result[topKey] = {};
        (result[topKey] as Record<string, unknown>)[subKey] = (
          nested as Record<string, unknown>
        )[subKey];
      }
    }
  }

  return result;
}

