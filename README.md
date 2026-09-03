# HoldSlot

OpenAI [WebMCP Challenge](https://webmcp.devpost.com/) 2026.

A booking desk where an **in-browser agent can search and hold a slot**, and **only the human can confirm**. The hold is visible on the same page. Confirm is a button, not a WebMCP tool.

Live: after deploy, the production URL is the judge URL.

## Why WebMCP

Agents are bad at calendars. They click the wrong cell, double-book, or submit while the person looks away. HoldSlot exposes **page-owned tools** so the agent does real work on the live board, then stops at the commitment.

## Tools (`document.modelContext.registerTool`)

| Tool | Who | What |
| --- | --- | --- |
| `search_slots` | Agent | Open slots by day and duration |
| `hold_slot` | Agent | Hold an open slot (expires in 3 minutes) |
| `list_holds` | Agent | Current holds and remaining time |
| `release_hold` | Agent | Drop a hold |
| `get_board` | Agent | Full board snapshot |
| `request_confirm` | Agent | Ask the human to confirm. **Does not confirm.** |

**Not a tool:** `Confirm booking`. Only the person on the page can press it.

## Test (judges)

1. Open the live URL in **ChatGPT’s in-app browser**, or Chrome with `chrome://flags/#enable-webmcp-testing` enabled.
2. Ask: *Search next available 30-minute slots, hold one, then stop. Do not confirm.*
3. You should see a **hold** with a timer. Confirm stays a human button.
4. If WebMCP is missing, the banner on the page says so.

No login. Simulated clinic / interview slots only. No real payments.

## Run locally

Serve the folder over HTTP (WebMCP needs a page context; file:// is unreliable):

```bash
npx serve .
```

Open the URL, enable the Chrome WebMCP flag, reload.

## Stack

Static HTML / CSS / JS. No backend. State is in the page so the human and the agent share one board.

## License

MIT. See [LICENSE](LICENSE).
