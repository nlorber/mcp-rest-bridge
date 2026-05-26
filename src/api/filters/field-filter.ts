/**
 * Pick only the allowed fields from an object.
 *
 * Supports a single level of dot-notation for nested fields, e.g.
 * "address.city". Deeper paths like "a.b.c" are not supported and will
 * be treated as a single nested key lookup on the top-level object.
 *
 * Uses own-property checks (`Object.hasOwn`) so prototype-chain fields
 * are never leaked through the filter.
 *
 * Non-object inputs (primitives, null) return an empty object — safe by
 * default. Arrays are handled element-by-element, recursing into each
 * object element; non-object elements are dropped.
 */
export function pickFields(
  obj: unknown,
  fields: string[],
): Record<string, unknown> | Record<string, unknown>[] {
  // Arrays: recurse into each element, keep only results from object-shaped inputs
  if (Array.isArray(obj)) {
    const results: Record<string, unknown>[] = [];
    for (const item of obj) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        results.push(pickFields(item, fields) as Record<string, unknown>);
      }
      // Primitives and nulls inside arrays are silently dropped
    }
    return results;
  }

  // Non-object primitives (null, undefined, number, string, boolean): safe fallback
  if (obj === null || typeof obj !== "object") {
    return {};
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const dotIndex = field.indexOf(".");
    if (dotIndex === -1) {
      if (Object.hasOwn(record, field)) {
        result[field] = record[field];
      }
    } else {
      const topKey = field.slice(0, dotIndex);
      const subKey = field.slice(dotIndex + 1);

      if (!Object.hasOwn(record, topKey)) continue;
      const nested = record[topKey];
      if (nested == null || typeof nested !== "object" || Array.isArray(nested)) continue;

      const nestedObj = nested as Record<string, unknown>;
      if (!Object.hasOwn(nestedObj, subKey)) continue;

      if (!Object.hasOwn(result, topKey)) result[topKey] = {};
      (result[topKey] as Record<string, unknown>)[subKey] = nestedObj[subKey];
    }
  }

  return result;
}

