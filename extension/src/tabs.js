export function nextTabIndex(tabs, currentIndex, delta) {
  if (!tabs.length) {
    return 0;
  }
  const sorted = [...tabs].sort((a, b) => a.index - b.index);
  const len = sorted.length;
  return (currentIndex + delta + len * 50) % len;
}

export function collectClosedTab(stack, tab) {
  if (!tab?.url) {
    return stack;
  }
  const next = [...stack, { url: tab.url, title: tab.title || tab.url }];
  return next.slice(-50);
}

export function restoreClosedTab(stack) {
  if (!stack.length) {
    return { stack, tab: null };
  }
  const tab = stack[stack.length - 1];
  return { stack: stack.slice(0, -1), tab };
}
