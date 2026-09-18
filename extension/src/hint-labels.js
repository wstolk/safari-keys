export function generateHintLabels(count, alphabet) {
  if (count <= 0) {
    return [];
  }
  const chars = [...alphabet];
  if (chars.length === 0) {
    return [];
  }

  let length = 1;
  let capacity = chars.length;
  while (capacity < count && length < 5) {
    length += 1;
    capacity *= chars.length;
  }

  return combinations(chars, length).slice(0, count);
}

function combinations(chars, length) {
  if (length === 1) {
    return chars.slice();
  }
  const result = [];
  const shorter = combinations(chars, length - 1);
  for (const head of chars) {
    for (const tail of shorter) {
      result.push(head + tail);
    }
  }
  return result;
}

export function filterHints(labels, typed) {
  if (!typed) {
    return labels.slice();
  }
  return labels.filter((label) => label.startsWith(typed));
}

export function pickHint(labels, typed) {
  const remaining = filterHints(labels, typed);
  if (remaining.length === 1) {
    return remaining[0];
  }
  if (typed && remaining.includes(typed)) {
    return typed;
  }
  return null;
}
