/**
 * Shared AI instructions for paradigm/table normalization.
 * Linguistic decisions stay with the model — no language-specific
 * suffix lists or case tables in application code.
 */
export const PARADIGM_AI_RULES = `
CRITICAL paradigm rules (apply for the study language using linguistic judgment):

A. ONE ROW PER CATEGORY LABEL
- The first column is ONLY a grammatical category/case/tense label (e.g. Genitive, Present).
- NEVER put inflected word forms, person forms, or possessives in the first column.
- If two rows share the same category label, MERGE them into one row.

B. ALTERNATIVE SPELLINGS → SAME CELL WITH "/"
- When the same category+number cell has multiple legitimate variants (not person copies), join them with "/" and NO spaces: formA/formB.
- BAD: two Genitive rows with plural formA and formB.
- GOOD: one Genitive row, plural cell = formA/formB.

C. STRIP PERSON / POSSESSIVE / AGREEMENT ENDINGS
- Long dumps often list the same stem with different person/possessor endings.
- Those are NOT separate paradigm rows. Strip the person/possessor endings and keep ONLY the bare case/number form the learner needs.
- Do NOT keep my/your/our/… marked copies. Do NOT invent new stems; only remove endings you can confidently identify for the study language.
- If many lines are all tagged with a broad plural label but are actually possessives of genitive/other cases, remapping with morphology — do not trust the dump labels.

D. COMPACT OUTPUT
- Prefer ONE paradigm table.
- One row per distinct category.
- Fill singular/plural (or equivalent) columns; leave "—" only when truly missing.
- Drop empty and redundant rows.

E. EXAMPLES OF SHAPE (generic — adapt labels/forms to the study language)

BAD duplicate variants:
[["Genitive","stemX","variantA"],["Genitive","stemX","variantB"]]
GOOD:
[["Genitive","stemX","variantA/variantB"]]

BAD possessive dump treated as many rows / wrong columns:
[ ["Plural","form+1sg","form+2sg"], ["form+1pl","form+2pl","form+3"] ]
GOOD (after stripping person endings + correct categories):
[ ["Nominative","","barePlural"], ["Genitive","bareGenSg","bareGenPl"] ]
`.trim();
