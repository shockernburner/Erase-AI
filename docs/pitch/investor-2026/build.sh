#!/usr/bin/env bash
# Regenerate the model outputs, the deck and the script. Needs python3 (openpyxl, python-docx) and pptxgenjs for node:
#   npm i pptxgenjs@3.12.0 in any folder, then NODE_PATH=<that folder>/node_modules ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
python3 ../model/plan_model.py
python3 facts.py
node build_deck.js
zip -dq ../EraseAI_Investor_Deck_2026.pptx '*/' || true   # folder entries upset some cloud viewers
if [ -f build_script.py ]; then python3 build_script.py; fi
if [ -f check_numbers.py ]; then python3 check_numbers.py; fi
