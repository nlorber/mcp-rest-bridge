/**
 * Pick only the allowed fields from an object.
 *
 * Supports a single level of dot-notation for nested fields, e.g.
 * "address.city". Deeper paths like "a.b.c" are not supported and will
 * be treated as a single nested key lookup on the top-level object.
 *
 * Uses own-property checks (`Object.hasOwn`) so prototype-chain fields
 * are never leaked through the filter.
 */
export function pickFields(
  obj: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const dotIndex = field.indexOf(".");
    if (dotIndex === -1) {
      if (Object.hasOwn(obj, field)) {
        result[field] = obj[field];
      }
    } else {
      const topKey = field.slice(0, dotIndex);
      const subKey = field.slice(dotIndex + 1);

      if (!Object.hasOwn(obj, topKey)) continue;
      const nested = obj[topKey];
      if (nested == null || typeof nested !== "object") continue;

      const nestedObj = nested as Record<string, unknown>;
      if (!Object.hasOwn(nestedObj, subKey)) continue;

      if (!Object.hasOwn(result, topKey)) result[topKey] = {};
      (result[topKey] as Record<string, unknown>)[subKey] = nestedObj[subKey];
    }
  }

  return result;
}

