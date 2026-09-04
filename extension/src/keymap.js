export function createKeyState() {
  return { prefix: "", count: null };
}

export function eventToKey(event) {
  if (event.metaKey || event.altKey) {
    return null;
  }
  if (event.ctrlKey) {
    return event.key === "[" ? "Escape" : null;
  }
  return event.key;
}

export function interpretKey(state, key, mappings) {
  if (key === "Escape") {
    return { status: "escape", state: createKeyState(), command: null, count: 1 };
  }

  if (state.prefix === "" && /^[1-9]$/.test(key)) {
    const nextCount = (state.count ?? 0) * 10 + Number(key);
    return {
      status: "pending",
      state: { prefix: "", count: nextCount },
      command: null,
      count: nextCount,
    };
  }

  if (state.prefix === "" && key === "0" && state.count !== null) {
    const nextCount = state.count * 10;
    return {
      status: "pending",
      state: { prefix: "", count: nextCount },
      command: null,
      count: nextCount,
    };
  }

  const sequence = `${state.prefix}${key}`;
  if (Object.prototype.hasOwnProperty.call(mappings, sequence)) {
    return {
      status: "command",
      state: createKeyState(),
      command: mappings[sequence],
      count: state.count ?? 1,
    };
  }

  const hasPrefix = Object.keys(mappings).some((mapping) => mapping.startsWith(sequence));
  if (hasPrefix) {
    return {
      status: "pending",
      state: { prefix: sequence, count: state.count },
      command: null,
      count: state.count ?? 1,
    };
  }

  return { status: "unbound", state: createKeyState(), command: null, count: 1 };
}
