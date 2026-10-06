# Medium article — EraseAI Firewall

The technical "how we built it" piece for Medium, aimed at developers and
security engineers. LinkedIn gets the business story (`linkedin-article.md`);
this one gets the engineering. Every technical claim matches extension 1.4.4;
re-check `extension/src/` before editing numbers or behaviour.

- **Cover image:** `docs/marketing/covers/article-cover.png` (rebuild with `docs/marketing/video/build_cover.py`)
  (Medium crops covers to roughly 16:9, so this works as is).
- **Inline media:** paste the YouTube link to the demo video after "What it
  does" (Medium embeds it). Optionally add store screenshot 3 (attachments)
  after "Reading attachments".
- **Tags (max 5):** `Cybersecurity`, `Chrome Extension`, `Artificial
  Intelligence`, `Privacy`, `JavaScript`
- **Publication:** submit to a security or JavaScript publication (for example
  InfoSec Write-ups, or JavaScript in Plain English) for reach; publish on
  your own profile if they don't respond within a few days.
- **Link:** `utm_source=medium&utm_medium=article`.
- Code blocks are simplified excerpts. Keep the "simplified" note so nobody
  expects them to match the source line for line.

---

## Title

```
How we built a firewall for AI prompts inside a Chrome extension
```

## Subtitle

```
Catching API keys and personal data at the moment you press Send in ChatGPT, Claude and Gemini, without sending your text anywhere.
```

## Body

````
Every week, developers paste config files, stack traces and customer data into AI chats. Most of the time it's harmless. Occasionally there's a live access key in the middle of that config, or a customer's phone number in that support thread, and once you press Send there's no undo.

The usual answers don't fit this problem well. Banning AI tools pushes usage onto personal devices. Network data-loss prevention sits on a corporate proxy that a laptop at home never touches. A policy document doesn't stop a paste at 6 PM on a Friday.

So we put the check in the one place that sees everything before it's encrypted and sent: the browser tab itself. This is how EraseAI Firewall works, what was harder than expected, and where it falls short.

WHAT IT DOES

When you press Send in ChatGPT, Claude, Gemini or Replit, the extension checks your message and every attached file. If nothing is found, the message goes through untouched. If something is found, a panel shows exactly what and where, and you choose:

- Sanitize & Send (Personal plan): sensitive values are replaced with placeholders, so the model only sees the masked version
- Send Anyway: you know the context better than a rule does
- Cancel: go back and fix it yourself

[Embed the demo video here]

1. INTERCEPTING SEND, RELIABLY

The core trick is simple: listen before the page does.

DOM events travel down from the document to the target (capture phase) before bubbling back up. The AI apps register their send handlers in the normal bubbling phase. A listener registered with capture: true on the send button and on the document's keydown runs first, so it can stop the event, scan, and then replay the send if the user approves.

```js
// Simplified
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.shiftKey) return;
  if (!isComposer(e.target)) return;
  e.preventDefault();
  // the page never sees this Enter
  e.stopImmediatePropagation();
  scanThenMaybeSend();
}, true); // capture phase

sendButton.addEventListener(
  "click", interceptSubmission, true);
```

The hard part isn't the event model, it's the apps. Each one is a single-page app that re-renders its composer constantly, uses a different editor (a plain textarea in one, a rich contenteditable in another), and changes its markup without notice. ChatGPT's Work mode has its own send path. Gemini rebuilds the button. So the extension watches the DOM for new composers and buttons, hooks them as they appear, and has a regression test per site for each send path we've seen break.

The second hard part is replaying the send. After a user approves, we have to submit the exact (possibly sanitized) text through the app's own UI, so the app behaves as if the user had pressed Send normally, without re-triggering our own interceptor in a loop.

2. DETECTION: RULES AND VALIDATORS, NOT A MODEL

Detection is deliberately rule-based: patterns for known secret formats (access keys, tokens, private keys, database connection strings, "password = …" assignments) and personal data (emails, phone numbers, card numbers, national IDs).

We chose rules over an ML classifier for three reasons:

- Speed. The check sits between a keypress and a network request. It has to finish in milliseconds.
- Explainability. "This matched the access key format at character 212" is something a user can verify and a security team can audit.
- Privacy. Rules run anywhere, including fully on the user's machine.

The weakness of pattern matching is false positives, and that's where validators come in. A 16-digit number isn't a card number just because it's 16 digits: timestamps, order IDs and ISBN-13 book codes all look similar. So a card match only counts if it passes the Luhn checksum that real card numbers satisfy, or if the surrounding text actually talks about a card.

```js
// Simplified
function luhnValid(digits) {
  let sum = 0, double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}
```

Every rule we add follows the same pattern: a broad match, then a validator or context check that throws out the look-alikes.

3. ONE RULE SET, TWO PLACES

The extension used to need an account and an API key before it checked anything. The detection rules lived on our server. Most people who installed it never got as far as creating an account, so most installs were protecting nobody.

The fix was to run the same rules on the device. But maintaining two copies of a detection engine, one in the server and one in the extension, is how you end up with a server that catches something the extension misses.

So we don't maintain two copies. A build script takes the server's rule modules and generates the extension's on-device scanner from them. Two tests keep them honest:

- The generated file must be byte-for-byte what the build script would produce today. Change a server rule without regenerating, and the extension's test suite fails.
- A set of sample prompts runs through both the server functions and the generated scanner, and the results must be identical.

Now the extension protects from the first prompt after installing, with no account and nothing leaving the machine. An account becomes an upgrade (server-side scanning, history, a team dashboard) instead of a gate.

4. READING ATTACHMENTS IN THE BROWSER

Prompts are only half the risk. The other half is the file: a customer export, a contract PDF, a screenshot of an admin console.

The extension extracts text from attachments before they're sent, entirely in the browser:

- PDFs with pdf.js
- Word documents with mammoth
- Spreadsheets and slide decks by reading the Office Open XML inside the file
- Images with Tesseract OCR compiled to WebAssembly, so the image itself never leaves the device
- ZIP and TAR archives, file by file

All of this runs inside an extension sandbox page, isolated from both the AI site and the extension's privileged code. Parsing untrusted files is exactly the kind of code you want boxed in.

Archives needed their own guard rails. A small compressed file can expand to gigabytes (a "zip bomb"). Decompression uses the browser's built-in DecompressionStream and stops the moment output passes a cap, and there are limits on entries per archive, bytes per entry, total bytes and nesting depth. If a file is too large or too deep, it is never silently waved through: a file that couldn't be read is listed as skipped and blocks the send until the user explicitly opts in, and a file that was only partly read is flagged as such.

For text-based files, the panel offers a one-click "Download clean copy" with the sensitive values replaced, so you can re-attach a safe version instead of editing it by hand.

5. PRIVACY: THE BAR FOR AN EXTENSION THAT READS YOUR PROMPTS

An extension that reads your AI conversations has to justify every permission. Ours:

- Content scripts run only on the four AI sites. The only other host the extension can talk to is our own API.
- Browser permissions are storage and activeTab. Nothing else.
- Without an account, every check runs locally. Nothing is sent anywhere.
- With an account, message text goes to our API over HTTPS for scanning. Scan history keeps a short excerpt with secrets masked, so a team can review what was caught without the history becoming a secret store itself.
- OCR always runs locally, account or not.

WHAT IT DOESN'T DO

Honest limits, because a security tool that oversells is worse than none:

- It only catches what it has rules for. A secret in a format we don't recognise, or sensitive information that isn't structured (a confidential strategy written in plain English), will get through.
- Rules produce false positives. That's why Send Anyway exists, and why we treat every false-positive report as a bug.
- It protects the browser. Desktop and mobile AI apps need a different approach (phones are covered by the separate EraseAI Android app).
- It checks what goes into the AI, not what comes out. Reviewing AI-generated code and content before it ships is a separate problem, and just as important.

WHAT WE LEARNED

- Put the check where the decision happens. The moment between paste and send is the only point where you can stop a mistake without blocking the tool.
- Default to local. Moving detection on-device turned a product that needed sign-up into one that works on install, and made the privacy story simple.
- Generate, don't duplicate. One rule set, compiled to two targets, with a test that fails on drift.
- Keep the human in charge. People work around tools that block them. A clear explanation plus three choices gets used.

TRY IT

EraseAI Firewall is free on the Chrome Web Store and works without an account. EraseAI Personal ($5 a month) adds one-click Sanitize, attachment scanning and the Android app:
https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp?utm_source=medium&utm_medium=article&utm_campaign=launch

Paste a fake key (AKIAIOSFODNN7EXAMPLE is the documented example access key) into ChatGPT and press Send.

If it flags something it shouldn't, or misses something it should have caught, leave a response. That feedback goes straight into the rules.
````

---

## After publishing

- Share the Medium link on LinkedIn a few days after the LinkedIn article,
  framed for engineers ("the technical write-up").
- Submit to Hacker News only once, as the Show HN in
  `extension-launch-posts.md`. Don't also submit the Medium link.
- Reply to every Medium response in the first week. Medium's distribution
  favours stories with engaged responses.
