// Price-level ranges as models write them: "> 250", "180-210", "< 150", "150以下".

/** [low, high] with null for an open end, or null when there is no number. */
export function parseRange(text) {
  const s = String(text).replace(/,/g, "");
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (!nums.length) return null;
  if (/^\s*[>≥]/.test(s) || /above|以上|超过/.test(s)) return [nums[0], null];
  if (/^\s*[<≤]/.test(s) || /below|以下|低于/.test(s)) return [null, nums[0]];
  if (nums.length >= 2) return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
  return [nums[0], nums[0]];
}
