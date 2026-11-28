# Investor deck and script 2026

Outputs: `../EraseAI_Investor_Deck_2026.pptx` (20 slides, opens in Keynote and PowerPoint) and
`../EraseAI_Investor_Script_2026.docx` (speaking script, about 15 minutes, plus 15 investor questions).

Every number comes from the model: `../model/plan_model.py` reads `../EraseAI_5yr_plan_model.xlsx`, writes the Plan
sheets and `../model/plan.json`; `facts.py` formats them (with `../model/sources.json`, checked statistics) into
`facts.json`; `build_deck.js` and `build_script.js` print only from `facts.json`; `check_numbers.py` fails on any number
not in `facts.json` and on forbidden phrases.

To change an assumption: edit `PLAN` in `../model/plan_model.py`, then run

    npm i --prefix /tmp/pptx pptxgenjs@3.12.0
    NODE_PATH=/tmp/pptx/node_modules:$(npm root -g) ./build.sh

(`docx` must be installed for node too: `npm i -g docx` if `npm root -g` lacks it.) Expect "0 problems" at the end.
