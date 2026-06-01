/**
 * Pick only the allowed fields from an object.
 *
 * Supports arbitrary-depth dot-notation for nested fields, e.g. "address.city"
 * or "user.address.city". Paths sharing a prefix are merged, so
 * ["user.name", "user.address.city"] selects both under a single "user" key.
 *
 * Uses own-property checks (`Object.hasOwn`) so prototype-chain fields are never
 * leaked, and nested keys are assigned with `Object.defineProperty` to avoid
 * prototype pollution via paths like "__proto__.x".
 *
 * Safe-by-default at every level:
 * - Non-object inputs (primitives, null) return an empty object.
 * - Arrays are handled element-by-element, recursing into each object element;
 *   non-object elements are dropped.
 * - A dot-path whose intermediate value is an array or primitive is skipped, not
 *   descended into — arrays are never traversed via dot-notation.
 * - A nested key is emitted only when something downstream actually matched; a
 *   path that resolves to nothing leaves no empty husk behind.
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
  // Group nested paths by their first segment so each child object is recursed once.
  const nestedPaths = new Map<string, string[]>();

  for (const field of fields) {
    const dotIndex = field.indexOf(".");
    if (dotIndex === -1) {
      if (Object.hasOwn(record, field)) {
        assignField(result, field, record[field]);
      }
    } else {
      const topKey = field.slice(0, dotIndex);
      const rest = field.slice(dotIndex + 1);
      const existing = nestedPaths.get(topKey);
      if (existing) {
        existing.push(rest);
      } else {
        nestedPaths.set(topKey, [rest]);
      }
    }
  }

  for (const [topKey, subPaths] of nestedPaths) {
    if (!Object.hasOwn(record, topKey)) continue;
    const value = record[topKey];
    // Safe-by-default: only descend into plain objects. Arrays and primitives
    // along a dot path are skipped, never leaked.
    if (value === null || typeof value !== "object" || Array.isArray(value)) continue;

    const picked = pickFields(value, subPaths) as Record<string, unknown>;
    // Emit the key only if something downstream matched.
    if (Object.keys(picked).length > 0) {
      assignField(result, topKey, picked);
    }
  }

  return result;
}

/**
 * Assign a key to the result without risking prototype pollution. `Object.defineProperty`
 * with an own data descriptor never walks the prototype chain, so a key named
 * "__proto__" lands as a plain own property rather than mutating the prototype.
 */
function assignField(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

