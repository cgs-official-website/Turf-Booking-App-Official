export function dedupe(items, keyExtractor = (item) => item.id || item._id || item.uid || item.email || item.phone) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.filter((item) => {
    if (!item) return false;
    const key = String(keyExtractor(item) || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
