"""Fails (exit 1) if the deck or script contains a number that is not in facts.json, or a forbidden phrase.

Run: python3 check_numbers.py   ->   "0 problems" when clean.
"""
import json
import os
import re
import sys

from docx import Document
from pptx import Presentation

HERE = os.path.dirname(os.path.abspath(__file__))
DECK = os.path.join(HERE, "..", "EraseAI_Investor_Deck_2026.pptx")
SCRIPT = os.path.join(HERE, "..", "EraseAI_Investor_Script_2026.docx")
NUM = re.compile(r"(?<![\w.])(\d[\d,]*(?:\.\d+)?)\s?([kMB%]?)(?![\w])")
VERSION = re.compile(r"\b\d+\.\d+\.\d+\b")
CLOCK = re.compile(r"\b\d{1,2}:\d{2}\b")
FORBIDDEN = [r"active pilots?", r"\bAI detection\b", r"\bVPN\b", r"\bno retention\b", r"\bfirst\b", r"\bonly\b",
             r"\$99\b", r"7-day trial", r"\bPhD\b", r"\bdoctora", r"\binstalls?\b", r"\busers\b",
             r"IPO (?:in|by|within) (?:year )?[1-5]\b", r"\bguarantee", r"\bAI-powered\b"]
# S$ figures that restate the pre-seed ask; numbers in the address and contact lines.
EXTRA = ["1.0M", "3.0M", "600k", "400k", "200", "8243", "0739", "049422", "202606980"]


def tokens(text):
    text = VERSION.sub(" ", CLOCK.sub(" ", text))
    return {(n.replace(",", "") + s) for n, s in NUM.findall(text)}


def strings(o):
    if isinstance(o, dict):
        for v in o.values():
            yield from strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from strings(v)
    elif isinstance(o, (str, int, float)):
        yield str(o)


def deck_texts():
    for i, slide in enumerate(Presentation(DECK).slides, 1):
        for sh in slide.shapes:
            if sh.has_text_frame:
                yield f"deck slide {i}", sh.text_frame.text
            if sh.has_table:
                for row in sh.table.rows:
                    for c in row.cells:
                        yield f"deck slide {i} table", c.text
        if slide.has_notes_slide:
            yield f"deck slide {i} notes", slide.notes_slide.notes_text_frame.text


def script_texts():
    d = Document(SCRIPT)
    for p in d.paragraphs:
        yield "script", p.text
    for t in d.tables:
        for row in t.rows:
            for c in row.cells:
                yield "script table", c.text


def main():
    facts = json.load(open(os.path.join(HERE, "facts.json")))
    allowed = set(EXTRA)
    for s in strings(facts):
        allowed |= tokens(s)
    allowed |= set(facts["constants"])
    problems = []
    for where, text in list(deck_texts()) + list(script_texts()):
        for t in tokens(text):
            if t not in allowed:
                problems.append(f"{where}: number '{t}' not in facts.json  <- {text[:90]!r}")
        for pat in FORBIDDEN:
            m = re.search(pat, text, re.I)
            if m and not text.startswith("http"):
                problems.append(f"{where}: forbidden '{m.group(0)}'  <- {text[:90]!r}")
    for p in sorted(set(problems)):
        print(p)
    print(f"{len(set(problems))} problems")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
