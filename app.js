(() => {
  const HOLD_MS = 3 * 60 * 1000;
  const DAYS = 3;
  const START_HOUR = 9;
  const END_HOUR = 17;

  const state = {
    slots: [],
    activeHoldId: null,
    receipts: [],
  };

  const el = {
    banner: document.getElementById("webmcp-banner"),
    board: document.getElementById("board"),
    day: document.getElementById("day-filter"),
    hold: document.getElementById("active-hold"),
    confirm: document.getElementById("btn-confirm"),
    release: document.getElementById("btn-release"),
    log: document.getElementById("log"),
    clock: document.getElementById("clock"),
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function dayKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function labelDay(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function expireHolds() {
    const now = Date.now();
    for (const slot of state.slots) {
      if (slot.status === "held" && slot.holdUntil <= now) {
        slot.status = "open";
        slot.holdUntil = null;
        slot.heldBy = null;
        if (state.activeHoldId === slot.id) state.activeHoldId = null;
        log("system", `Hold expired on ${slot.id}`);
      }
    }
  }

  function snapshot(slot) {
    return {
      id: slot.id,
      day: slot.day,
      start: slot.start,
      durationMin: slot.durationMin,
      status: slot.status,
      holdUntil: slot.holdUntil,
      secondsLeft:
        slot.status === "held" && slot.holdUntil
          ? Math.max(0, Math.round((slot.holdUntil - Date.now()) / 1000))
          : null,
    };
  }

  function seed() {
    const slots = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let n = 0;
    for (let d = 0; d < DAYS; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      const key = dayKey(day);
      for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        for (const min of [0, 30]) {
          n += 1;
          const blocked = n % 7 === 0;
          slots.push({
            id: `slot_${key}_${pad(hour)}${pad(min)}`,
            day: key,
            start: `${pad(hour)}:${pad(min)}`,
            durationMin: 30,
            status: blocked ? "blocked" : "open",
            holdUntil: null,
            heldBy: null,
          });
        }
      }
    }
    state.slots = slots;
  }

  function log(source, text) {
    const li = document.createElement("li");
    const t = new Date().toLocaleTimeString();
    li.innerHTML = `<span class="t">${t} · ${source}</span><br>${text}`;
    el.log.prepend(li);
  }

  function render() {
    expireHolds();
    const day = el.day.value;
    const visible = state.slots.filter((s) => s.day === day);
    el.board.innerHTML = "";
    for (const slot of visible) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `slot ${slot.status}`;
      btn.disabled = slot.status === "blocked" || slot.status === "booked";
      const extra =
        slot.status === "held" && slot.holdUntil
          ? `${Math.max(0, Math.ceil((slot.holdUntil - Date.now()) / 1000))}s left`
          : slot.status;
      btn.innerHTML = `<strong>${slot.start}</strong><small>${slot.durationMin} min · ${extra}</small>`;
      btn.addEventListener("click", () => {
        if (slot.status === "open") holdSlot(slot.id, "human");
        else if (slot.status === "held") selectHold(slot.id);
      });
      el.board.appendChild(btn);
    }

    const hold = state.slots.find((s) => s.id === state.activeHoldId && s.status === "held");
    if (!hold) {
      el.hold.className = "hold-card empty";
      el.hold.textContent = "No active hold";
      el.confirm.disabled = true;
      el.release.disabled = true;
    } else {
      const sec = Math.max(0, Math.ceil((hold.holdUntil - Date.now()) / 1000));
      el.hold.className = "hold-card active";
      el.hold.innerHTML = `<strong>${labelDay(hold.day)} · ${hold.start}</strong><br>Held ${sec}s remaining. Confirm is human-only.`;
      el.confirm.disabled = false;
      el.release.disabled = false;
    }

    el.clock.textContent = new Date().toLocaleString();
  }

  function selectHold(id) {
    const slot = state.slots.find((s) => s.id === id);
    if (slot && slot.status === "held") state.activeHoldId = id;
    render();
  }

  function searchSlots({ day, durationMin } = {}) {
    expireHolds();
    return state.slots
      .filter((s) => s.status === "open")
      .filter((s) => !day || s.day === day)
      .filter((s) => !durationMin || s.durationMin === Number(durationMin))
      .map(snapshot);
  }

  function holdSlot(id, actor) {
    expireHolds();
    const slot = state.slots.find((s) => s.id === id);
    if (!slot) return { ok: false, error: "Unknown slot id" };
    if (slot.status !== "open") return { ok: false, error: `Slot is ${slot.status}` };
    const existing = state.slots.find((s) => s.status === "held");
    if (existing && existing.id !== slot.id) {
      existing.status = "open";
      existing.holdUntil = null;
      existing.heldBy = null;
    }
    slot.status = "held";
    slot.holdUntil = Date.now() + HOLD_MS;
    slot.heldBy = actor;
    state.activeHoldId = slot.id;
    log(actor, `Held ${slot.id}`);
    render();
    return { ok: true, slot: snapshot(slot) };
  }

  function listHolds() {
    expireHolds();
    return state.slots.filter((s) => s.status === "held").map(snapshot);
  }

  function releaseHold(id, actor) {
    const slot = state.slots.find((s) => s.id === id);
    if (!slot) return { ok: false, error: "Unknown slot id" };
    if (slot.status !== "held") return { ok: false, error: "Slot is not held" };
    slot.status = "open";
    slot.holdUntil = null;
    slot.heldBy = null;
    if (state.activeHoldId === id) state.activeHoldId = null;
    log(actor, `Released ${id}`);
    render();
    return { ok: true, slot: snapshot(slot) };
  }

  function confirmBooking(actor) {
    const slot = state.slots.find((s) => s.id === state.activeHoldId);
    if (!slot || slot.status !== "held") {
      return { ok: false, error: "No active hold to confirm" };
    }
    if (actor !== "human") {
      return {
        ok: false,
        error: "Confirm is human-only. Use request_confirm so the person can press the button.",
      };
    }
    slot.status = "booked";
    slot.holdUntil = null;
    const receipt = {
      receiptId: `rcpt_${Date.now()}`,
      slot: snapshot(slot),
    };
    state.receipts.push(receipt);
    state.activeHoldId = null;
    log("human", `Confirmed ${slot.id} · ${receipt.receiptId}`);
    render();
    return { ok: true, receipt };
  }

  function requestConfirm() {
    const slot = state.slots.find((s) => s.id === state.activeHoldId && s.status === "held");
    if (!slot) {
      return {
        ok: false,
        error: "No active hold. Call hold_slot first. Confirm stays with the human.",
      };
    }
    log("agent", `Asked human to confirm ${slot.id}`);
    render();
    return {
      ok: true,
      waitingForHuman: true,
      slot: snapshot(slot),
      message: "Hold is ready. The person must press Confirm booking. Agents cannot complete this step.",
    };
  }

  function getBoard() {
    expireHolds();
    return {
      days: [...new Set(state.slots.map((s) => s.day))],
      slots: state.slots.map(snapshot),
      activeHoldId: state.activeHoldId,
    };
  }

  function toolResult(obj) {
    return { content: [{ type: "text", text: JSON.stringify(obj) }] };
  }

  function modelContext() {
    if (document.modelContext) return document.modelContext;
    if (navigator.modelContext) return navigator.modelContext;
    return null;
  }

  function registerTools() {
    const ctx = modelContext();
    if (!ctx || typeof ctx.registerTool !== "function") {
      el.banner.className = "banner bad";
      el.banner.textContent =
        "WebMCP not available. Open in ChatGPT’s in-app browser or enable chrome://flags/#enable-webmcp-testing.";
      return;
    }

    const tools = [
      {
        name: "search_slots",
        description:
          "Search open booking slots. Optional day as YYYY-MM-DD and durationMin (30). Returns open slots only.",
        inputSchema: {
          type: "object",
          properties: {
            day: { type: "string", description: "YYYY-MM-DD" },
            durationMin: { type: "number", description: "Slot length in minutes" },
          },
        },
        execute: async (input) => {
          const rows = searchSlots(input || {});
          log("agent", `search_slots → ${rows.length} open`);
          render();
          return toolResult({ ok: true, count: rows.length, slots: rows });
        },
      },
      {
        name: "hold_slot",
        description:
          "Hold an open slot for 3 minutes. Replaces any previous hold. Does not confirm the booking.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", description: "Slot id from search_slots" } },
          required: ["id"],
        },
        execute: async (input) => toolResult(holdSlot(input.id, "agent")),
      },
      {
        name: "list_holds",
        description: "List current holds and seconds remaining.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => toolResult({ ok: true, holds: listHolds() }),
      },
      {
        name: "release_hold",
        description: "Release a held slot back to open.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        execute: async (input) => toolResult(releaseHold(input.id, "agent")),
      },
      {
        name: "get_board",
        description: "Full board: days, every slot status, active hold id.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => toolResult({ ok: true, board: getBoard() }),
      },
      {
        name: "request_confirm",
        description:
          "Ask the human to confirm the active hold. This tool never books. Confirm is a button only the person can press.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => toolResult(requestConfirm()),
      },
    ];

    for (const tool of tools) {
      try {
        ctx.registerTool(tool);
      } catch (err) {
        log("system", `registerTool ${tool.name} failed: ${err.message}`);
      }
    }

    el.banner.className = "banner ok";
    el.banner.textContent = "WebMCP on. Agent can search/hold. Confirm is human-only.";
    log("system", "Registered search_slots, hold_slot, list_holds, release_hold, get_board, request_confirm");
  }

  function fillDays() {
    const days = [...new Set(state.slots.map((s) => s.day))];
    el.day.innerHTML = days
      .map((d, i) => `<option value="${d}">${i === 0 ? "Today · " : ""}${labelDay(d)}</option>`)
      .join("");
  }

  el.confirm.addEventListener("click", () => confirmBooking("human"));
  el.release.addEventListener("click", () => {
    if (state.activeHoldId) releaseHold(state.activeHoldId, "human");
  });
  el.day.addEventListener("change", render);

  seed();
  fillDays();
  registerTools();
  render();
  setInterval(render, 1000);
})();
