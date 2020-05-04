/* Validate a possible object ie. o = { "a": 2 } */
export const isJSONObject = (o) =>
  !!o && (typeof o === 'object') && !Array.isArray(o) &&
  (() => { try { return Boolean(JSON.stringify(o)); } catch { return false } })()

/* Validate a possible JSON object represented as string ie. s = '{ "a": 3 }' */
export function isJSONObjectString(s) {
  try {
    const o = JSON.parse(s);
    return !!o && (typeof o === 'object') && !Array.isArray(o)
  } catch {
    return false
  }
}

// Code Explanation:
// - !!o - Not falsy (excludes null, which registers as typeof 'object')
// - (typeof o === 'object') - Excludes boolean, number, and string
// - !Array.isArray(o) - Exclude arrays (which register as typeof 'object')
// - try ... JSON.stringify / JSON.parse - Asks JavaScript engine to determine if valid JSON


export function flattenJSONObject(data) {
  if (!isJSONObject(data)) {
    throw TypeError('Cannot flatten non JSON arguments');
  }
  var result = {};
  function recurse(cur, prop) {
    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      for (var i = 0, l = cur.length; i < l; i++)
        recurse(cur[i], prop + "[" + i + "]");
      if (l == 0)
        result[prop] = [];
    } else {
      var isEmpty = true;
      for (var p in cur) {
        isEmpty = false;
        recurse(cur[p], prop ? prop + "." + p : p);
      }
      if (isEmpty && prop)
        result[prop] = {};
    }
  }
  recurse(data, "");
  return result;
}