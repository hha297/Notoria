import fs from "node:fs";
import path from "node:path";

const messagesDir = path.join(process.cwd(), "messages");

const readingEn = {
  eyebrow: "Reading",
  title: "Reading",
  description:
    "Paste or import a passage, generate comprehension exercises, and practice with saved results.",
  disabledNoWorkspace: "Create a workspace before adding reading passages.",
  import: "Add passage",
  importFirst: "Add your first passage",
  importTitle: "Add a reading passage",
  importDescription:
    "Paste text or upload a PDF/DOCX, edit the preview, then optionally generate exercises.",
  importTabsAria: "Passage source",
  tabPaste: "Paste",
  tabUpload: "Upload",
  bodyLabel: "Passage text",
  bodyPlaceholder: "Paste or type the reading passage here…",
  titleLabel: "Title",
  titlePlaceholder: "Optional title",
  languageLabel: "Passage language",
  wordCount: "{count, plural, one {# word} other {# words}}",
  continuePreview: "Continue to preview",
  dropTitle: "Drop a PDF or DOCX here",
  dropDescription:
    "or click to browse. Scanned image-only PDFs are not supported yet.",
  extractSuccess: "Text extracted — review and edit before saving.",
  sourcePaste: "Pasted text",
  back: "Back",
  savePassage: "Save passage",
  saveAndGenerate: "Save & generate exercises",
  generateHint:
    "Generate comprehension questions in {language}. Uses your AI exercise quota.",
  modeLabel: "Exercise type",
  questionCountLabel: "Questions",
  difficultyLabel: "Difficulty",
  difficultyNone: "Auto",
  questionLanguageLabel: "Question language",
  skipGenerate: "Skip for now",
  generateExercises: "Generate exercises",
  generateTitle: "Generate exercises",
  generateDescription:
    "Create comprehension questions from this passage. Generation runs once and is saved.",
  exercisesGenerated: "Exercises ready.",
  created: "Passage saved",
  deleted: "Passage deleted",
  submitted: "Answers submitted",
  emptyTitle: "No reading passages yet",
  emptyDescription:
    "Paste a text or upload a PDF/DOCX to start reading practice.",
  myPassages: "My passages",
  passageHint:
    "Open a passage to generate exercises or continue practice.",
  open: "Open",
  practice: "Practice",
  startPractice: "Start practice",
  practiceTitle: "Reading practice",
  backToList: "Back to Reading",
  backToPassage: "Back to passage",
  passagePanel: "Passage",
  questionsPanel: "Questions",
  questionSets: "Exercise sets",
  noSetsYet: "No exercises yet",
  noSetsDescription:
    "Generate exercises once — they stay saved, so refresh will not regenerate them.",
  setCount: "{count, plural, one {# exercise set} other {# exercise sets}}",
  questionCountValue:
    "{count, plural, one {# question} other {# questions}}",
  staleSet: "Passage updated since this set",
  vocabHint:
    "Select a word or short phrase in the passage to add it to Vocabulary.",
  addToVocabulary: "Add to Vocabulary",
  deleteConfirmTitle: "Delete this passage?",
  deleteConfirmDescription:
    '"{title}" and all of its exercises and attempts will be permanently removed.',
  modes: {
    multiple_choice: "Multiple choice",
    written: "Written answers",
    true_false_not_stated: "True / False / Not stated",
    mixed: "Mixed",
  },
  sources: {
    paste: "Paste",
    pdf: "PDF",
    docx: "DOCX",
  },
  setStatus: {
    generating: "Generating",
    ready: "Ready",
    failed: "Failed",
  },
  tfns: {
    true: "True",
    false: "False",
    not_stated: "Not stated",
  },
  practiceSession: {
    submit: "Submit answers",
    loading: "Loading questions…",
    questionLabel: "Q{number}.",
    writtenPlaceholder: "Write your answer…",
    correct: "Correct",
    incorrect: "Not quite",
    expected: "Correct answer",
    objectiveScore: "{correct} / {total} objective correct",
    mobileTabsAria: "Practice panels",
  },
  errors: {
    UNAUTHORIZED: "Sign in to continue.",
    OPENAI_NOT_CONFIGURED: "AI is not configured.",
    INVALID_INPUT: "Check your input and try again.",
    INVALID_FILE: "Choose a PDF or DOCX file.",
    INVALID_FILE_TYPE: "Only PDF and DOCX files are supported.",
    FILE_TOO_LARGE: "That file is too large. Use a file under 10 MB.",
    EMPTY_CONTENT: "Add a longer passage (at least a few sentences).",
    SCANNED_PDF:
      "This PDF looks scanned or empty. Text-based PDFs work best — OCR is not available yet.",
    UNSUPPORTED_PARSE:
      "Could not read that file. Try a .docx or a text-based PDF.",
    PASSAGE_NOT_FOUND: "Reading passage not found.",
    SET_NOT_FOUND: "Exercise set not found.",
    ATTEMPT_NOT_FOUND: "Practice attempt not found.",
    SET_NOT_READY: "Exercises are not ready yet.",
    GENERATION_FAILED: "Could not generate exercises. Try again.",
    GENERATION_UNAVAILABLE: "Exercise generation is unavailable right now.",
    VALIDATION_FAILED: "Generated exercises were not usable. Try again.",
    GRADING_FAILED: "Could not grade written answers. Try again.",
    ATTEMPT_NOT_EDITABLE: "This attempt can no longer be edited.",
    PROCESSING_FAILED: "Something went wrong. Try again.",
  },
};

// Rename practiceSession -> practice in serialized output (duplicate key fix: string practice + object practice)
function serializeReadingBlock(obj) {
  const { practice: practiceLabel, practiceSession, ...rest } = obj;
  const inner = JSON.stringify(
    { ...rest, practiceSession },
    null,
    2,
  )
    .slice(1, -1)
    .trim();
  const lines = inner.split("\n").map((line) => (line ? `    ${line}` : line));
  const openLineIdx = lines.findIndex((l) => l.trim().startsWith('"open":'));
  if (openLineIdx === -1) {
    throw new Error('"open" key not found in serialization');
  }
  lines.splice(
    openLineIdx + 1,
    0,
    `    "practice": ${JSON.stringify(practiceLabel)},`,
  );
  const sessionIdx = lines.findIndex((l) =>
    l.trim().startsWith('"practiceSession":'),
  );
  if (sessionIdx === -1) {
    throw new Error("practiceSession key not found in serialization");
  }
  lines[sessionIdx] = lines[sessionIdx].replace(
    '"practiceSession"',
    '"practice"',
  );
  return lines.join("\n");
}

const readingFi = {
  ...readingEn,
  eyebrow: "Lukeminen",
  title: "Lukeminen",
  description:
    "Liitä tai tuo teksti, luo ymmärtämistehtäviä ja harjoittele tallennetuilla tuloksilla.",
  disabledNoWorkspace: "Luo työtila ennen lukutekstien lisäämistä.",
  import: "Lisää teksti",
  importFirst: "Lisää ensimmäinen teksti",
  importTitle: "Lisää lukuteksti",
  importDescription:
    "Liitä teksti tai lataa PDF/DOCX, muokkaa esikatselua ja luo halutessasi tehtäviä.",
  importTabsAria: "Tekstin lähde",
  tabPaste: "Liitä",
  tabUpload: "Lataa",
  bodyLabel: "Teksti",
  bodyPlaceholder: "Liitä tai kirjoita lukuteksti tähän…",
  titleLabel: "Otsikko",
  titlePlaceholder: "Valinnainen otsikko",
  languageLabel: "Tekstin kieli",
  wordCount:
    "{count, plural, one {# sana} other {# sanaa}}",
  continuePreview: "Jatka esikatseluun",
  dropTitle: "Pudota PDF tai DOCX tähän",
  dropDescription:
    "tai valitse tiedosto. Pelkästään skannattuja kuvia sisältäviä PDF-tiedostoja ei vielä tueta.",
  extractSuccess: "Teksti poimittu — tarkista ja muokkaa ennen tallennusta.",
  sourcePaste: "Liitetty teksti",
  back: "Takaisin",
  savePassage: "Tallenna teksti",
  saveAndGenerate: "Tallenna ja luo tehtäviä",
  generateHint:
    "Luo ymmärtämiskysymyksiä kielellä {language}. Käyttää tekoälytehtäväkiintiötäsi.",
  modeLabel: "Tehtävätyyppi",
  questionCountLabel: "Kysymykset",
  difficultyLabel: "Vaikeustaso",
  difficultyNone: "Automaattinen",
  questionLanguageLabel: "Kysymysten kieli",
  skipGenerate: "Ohita toistaiseksi",
  generateExercises: "Luo tehtäviä",
  generateTitle: "Luo tehtäviä",
  generateDescription:
    "Luo tästä tekstistä ymmärtämiskysymyksiä. Luonti tehdään kerran ja tallennetaan.",
  exercisesGenerated: "Tehtävät valmiina.",
  created: "Teksti tallennettu",
  deleted: "Teksti poistettu",
  submitted: "Vastaukset lähetetty",
  emptyTitle: "Ei lukutekstejä vielä",
  emptyDescription:
    "Liitä teksti tai lataa PDF/DOCX aloittaaksesi lukuharjoittelun.",
  myPassages: "Omat tekstit",
  passageHint:
    "Avaa teksti luodaksesi tehtäviä tai jatkaaksesi harjoittelua.",
  open: "Avaa",
  practice: "Harjoittele",
  startPractice: "Aloita harjoitus",
  practiceTitle: "Lukuharjoitus",
  backToList: "Takaisin lukemiseen",
  backToPassage: "Takaisin tekstiin",
  passagePanel: "Teksti",
  questionsPanel: "Kysymykset",
  questionSets: "Tehtäväsarjat",
  noSetsYet: "Ei tehtäviä vielä",
  noSetsDescription:
    "Luo tehtävät kerran — ne pysyvät tallessa, joten päivitys ei luo niitä uudelleen.",
  setCount:
    "{count, plural, one {# tehtäväsarja} other {# tehtäväsarjaa}}",
  questionCountValue:
    "{count, plural, one {# kysymys} other {# kysymystä}}",
  staleSet: "Tekstiä on päivitetty tämän sarjan jälkeen",
  vocabHint:
    "Valitse sana tai lyhyt lause tekstistä lisätäksesi sen sanastoon.",
  addToVocabulary: "Lisää sanastoon",
  deleteConfirmTitle: "Poistetaanko tämä teksti?",
  deleteConfirmDescription:
    "”{title}” ja kaikki sen tehtävät sekä yritykset poistetaan pysyvästi.",
  modes: {
    multiple_choice: "Monivalinta",
    written: "Kirjalliset vastaukset",
    true_false_not_stated: "Tosi / Epätosi / Ei mainita",
    mixed: "Sekalainen",
  },
  sources: { paste: "Liitä", pdf: "PDF", docx: "DOCX" },
  setStatus: {
    generating: "Luodaan",
    ready: "Valmis",
    failed: "Epäonnistui",
  },
  tfns: {
    true: "Tosi",
    false: "Epätosi",
    not_stated: "Ei mainita",
  },
  practiceSession: {
    submit: "Lähetä vastaukset",
    loading: "Ladataan kysymyksiä…",
    questionLabel: "K{number}.",
    writtenPlaceholder: "Kirjoita vastauksesi…",
    correct: "Oikein",
    incorrect: "Ei aivan",
    expected: "Oikea vastaus",
    objectiveScore: "{correct} / {total} objektiivista oikein",
    mobileTabsAria: "Harjoittelupaneelit",
  },
  errors: {
    UNAUTHORIZED: "Kirjaudu sisään jatkaaksesi.",
    OPENAI_NOT_CONFIGURED: "Tekoälyä ei ole määritetty.",
    INVALID_INPUT: "Tarkista syöte ja yritä uudelleen.",
    INVALID_FILE: "Valitse PDF- tai DOCX-tiedosto.",
    INVALID_FILE_TYPE: "Vain PDF- ja DOCX-tiedostot ovat tuettuja.",
    FILE_TOO_LARGE:
      "Tiedosto on liian suuri. Käytä alle 10 MB:n tiedostoa.",
    EMPTY_CONTENT: "Lisää pidempi teksti (vähintään muutama lausetta).",
    SCANNED_PDF:
      "Tämä PDF näyttää skannatulta tai tyhjältä. Tekstipohjaiset PDF:t toimivat parhaiten — OCR ei ole vielä käytössä.",
    UNSUPPORTED_PARSE:
      "Tiedostoa ei voitu lukea. Kokeile .docx-tiedostoa tai tekstipohjaista PDF:ää.",
    PASSAGE_NOT_FOUND: "Lukutekstiä ei löytynyt.",
    SET_NOT_FOUND: "Tehtäväsarjaa ei löytynyt.",
    ATTEMPT_NOT_FOUND: "Harjoitusyritystä ei löytynyt.",
    SET_NOT_READY: "Tehtävät eivät ole vielä valmiita.",
    GENERATION_FAILED: "Tehtäviä ei voitu luoda. Yritä uudelleen.",
    GENERATION_UNAVAILABLE: "Tehtävien luonti ei ole juuri nyt käytettävissä.",
    VALIDATION_FAILED: "Luodut tehtävät eivät olleet käytettäviä. Yritä uudelleen.",
    GRADING_FAILED: "Kirjallisia vastauksia ei voitu arvioida. Yritä uudelleen.",
    ATTEMPT_NOT_EDITABLE: "Tätä yritystä ei voi enää muokata.",
    PROCESSING_FAILED: "Jokin meni pieleen. Yritä uudelleen.",
  },
};

const readingSv = {
  ...readingEn,
  eyebrow: "Läsning",
  title: "Läsning",
  description:
    "Klistra in eller importera en text, skapa förståelseövningar och öva med sparade resultat.",
  disabledNoWorkspace: "Skapa en arbetsyta innan du lägger till lästexter.",
  import: "Lägg till text",
  importFirst: "Lägg till din första text",
  importTitle: "Lägg till en lästext",
  importDescription:
    "Klistra in text eller ladda upp PDF/DOCX, redigera förhandsgranskningen och skapa valfritt övningar.",
  importTabsAria: "Textkälla",
  tabPaste: "Klistra in",
  tabUpload: "Ladda upp",
  bodyLabel: "Text",
  bodyPlaceholder: "Klistra in eller skriv lästexten här…",
  titleLabel: "Titel",
  titlePlaceholder: "Valfri titel",
  languageLabel: "Textens språk",
  wordCount: "{count, plural, one {# ord} other {# ord}}",
  continuePreview: "Fortsätt till förhandsgranskning",
  dropTitle: "Släpp en PDF eller DOCX här",
  dropDescription:
    "eller klicka för att bläddra. Endast skannade bild-PDF:er stöds inte ännu.",
  extractSuccess: "Text extraherad — granska och redigera innan du sparar.",
  sourcePaste: "Inklistrad text",
  back: "Tillbaka",
  savePassage: "Spara text",
  saveAndGenerate: "Spara och skapa övningar",
  generateHint:
    "Skapa förståelsefrågor på {language}. Använder din AI-övningskvot.",
  modeLabel: "Övningstyp",
  questionCountLabel: "Frågor",
  difficultyLabel: "Svårighetsgrad",
  difficultyNone: "Automatisk",
  questionLanguageLabel: "Frågornas språk",
  skipGenerate: "Hoppa över så länge",
  generateExercises: "Skapa övningar",
  generateTitle: "Skapa övningar",
  generateDescription:
    "Skapa förståelsefrågor från denna text. Generering sker en gång och sparas.",
  exercisesGenerated: "Övningar klara.",
  created: "Text sparad",
  deleted: "Text borttagen",
  submitted: "Svar skickade",
  emptyTitle: "Inga lästexter ännu",
  emptyDescription:
    "Klistra in text eller ladda upp PDF/DOCX för att börja läsa.",
  myPassages: "Mina texter",
  passageHint: "Öppna en text för att skapa övningar eller fortsätta öva.",
  open: "Öppna",
  practice: "Öva",
  startPractice: "Starta övning",
  practiceTitle: "Lästräning",
  backToList: "Tillbaka till läsning",
  backToPassage: "Tillbaka till texten",
  passagePanel: "Text",
  questionsPanel: "Frågor",
  questionSets: "Övningsset",
  noSetsYet: "Inga övningar ännu",
  noSetsDescription:
    "Skapa övningar en gång — de sparas, så uppdatering genererar inte om dem.",
  setCount:
    "{count, plural, one {# övningsset} other {# övningsset}}",
  questionCountValue:
    "{count, plural, one {# fråga} other {# frågor}}",
  staleSet: "Texten har uppdaterats sedan detta set skapades",
  vocabHint:
    "Markera ett ord eller en kort fras i texten för att lägga till det i ordlistan.",
  addToVocabulary: "Lägg till i ordlista",
  deleteConfirmTitle: "Ta bort denna text?",
  deleteConfirmDescription:
    "”{title}” och alla dess övningar och försök tas bort permanent.",
  modes: {
    multiple_choice: "Flerval",
    written: "Skrivna svar",
    true_false_not_stated: "Sant / Falskt / Inte angivet",
    mixed: "Blandat",
  },
  sources: { paste: "Klistra in", pdf: "PDF", docx: "DOCX" },
  setStatus: {
    generating: "Genererar",
    ready: "Klar",
    failed: "Misslyckades",
  },
  tfns: {
    true: "Sant",
    false: "Falskt",
    not_stated: "Inte angivet",
  },
  practiceSession: {
    submit: "Skicka svar",
    loading: "Laddar frågor…",
    questionLabel: "F{number}.",
    writtenPlaceholder: "Skriv ditt svar…",
    correct: "Rätt",
    incorrect: "Inte helt",
    expected: "Rätt svar",
    objectiveScore: "{correct} / {total} objektivt rätt",
    mobileTabsAria: "Övningspaneler",
  },
  errors: {
    UNAUTHORIZED: "Logga in för att fortsätta.",
    OPENAI_NOT_CONFIGURED: "AI är inte konfigurerad.",
    INVALID_INPUT: "Kontrollera din inmatning och försök igen.",
    INVALID_FILE: "Välj en PDF- eller DOCX-fil.",
    INVALID_FILE_TYPE: "Endast PDF- och DOCX-filer stöds.",
    FILE_TOO_LARGE: "Filen är för stor. Använd en fil under 10 MB.",
    EMPTY_CONTENT: "Lägg till en längre text (minst några meningar).",
    SCANNED_PDF:
      "Denna PDF verkar skannad eller tom. Textbaserade PDF:er fungerar bäst — OCR finns inte ännu.",
    UNSUPPORTED_PARSE:
      "Kunde inte läsa filen. Prova .docx eller en textbaserad PDF.",
    PASSAGE_NOT_FOUND: "Lästexten hittades inte.",
    SET_NOT_FOUND: "Övningssetet hittades inte.",
    ATTEMPT_NOT_FOUND: "Övningsförsöket hittades inte.",
    SET_NOT_READY: "Övningarna är inte klara ännu.",
    GENERATION_FAILED: "Kunde inte skapa övningar. Försök igen.",
    GENERATION_UNAVAILABLE: "Övningsgenerering är inte tillgänglig just nu.",
    VALIDATION_FAILED: "Genererade övningar kunde inte användas. Försök igen.",
    GRADING_FAILED: "Kunde inte bedöma skrivna svar. Försök igen.",
    ATTEMPT_NOT_EDITABLE: "Detta försök kan inte längre redigeras.",
    PROCESSING_FAILED: "Något gick fel. Försök igen.",
  },
};

const readingVi = {
  ...readingEn,
  eyebrow: "Đọc",
  title: "Đọc",
  description:
    "Dán hoặc nhập đoạn văn, tạo bài tập đọc hiểu và luyện tập với kết quả đã lưu.",
  disabledNoWorkspace: "Tạo workspace trước khi thêm bài đọc.",
  import: "Thêm đoạn văn",
  importFirst: "Thêm đoạn văn đầu tiên",
  importTitle: "Thêm bài đọc",
  importDescription:
    "Dán văn bản hoặc tải PDF/DOCX, chỉnh sửa bản xem trước, rồi tùy chọn tạo bài tập.",
  importTabsAria: "Nguồn đoạn văn",
  tabPaste: "Dán",
  tabUpload: "Tải lên",
  bodyLabel: "Nội dung đoạn văn",
  bodyPlaceholder: "Dán hoặc gõ đoạn văn tại đây…",
  titleLabel: "Tiêu đề",
  titlePlaceholder: "Tiêu đề tùy chọn",
  languageLabel: "Ngôn ngữ đoạn văn",
  wordCount: "{count, plural, one {# từ} other {# từ}}",
  continuePreview: "Tiếp tục xem trước",
  dropTitle: "Thả PDF hoặc DOCX vào đây",
  dropDescription:
    "hoặc bấm để chọn tệp. PDF chỉ có ảnh quét chưa được hỗ trợ.",
  extractSuccess: "Đã trích xuất văn bản — xem lại và chỉnh sửa trước khi lưu.",
  sourcePaste: "Văn bản đã dán",
  back: "Quay lại",
  savePassage: "Lưu đoạn văn",
  saveAndGenerate: "Lưu và tạo bài tập",
  generateHint:
    "Tạo câu hỏi đọc hiểu bằng {language}. Dùng hạn mức bài tập AI của bạn.",
  modeLabel: "Loại bài tập",
  questionCountLabel: "Số câu hỏi",
  difficultyLabel: "Độ khó",
  difficultyNone: "Tự động",
  questionLanguageLabel: "Ngôn ngữ câu hỏi",
  skipGenerate: "Bỏ qua tạm thời",
  generateExercises: "Tạo bài tập",
  generateTitle: "Tạo bài tập",
  generateDescription:
    "Tạo câu hỏi đọc hiểu từ đoạn văn này. Chỉ tạo một lần và được lưu lại.",
  exercisesGenerated: "Bài tập đã sẵn sàng.",
  created: "Đã lưu đoạn văn",
  deleted: "Đã xóa đoạn văn",
  submitted: "Đã nộp câu trả lời",
  emptyTitle: "Chưa có bài đọc nào",
  emptyDescription:
    "Dán văn bản hoặc tải PDF/DOCX để bắt đầu luyện đọc.",
  myPassages: "Bài đọc của tôi",
  passageHint: "Mở một đoạn văn để tạo bài tập hoặc tiếp tục luyện tập.",
  open: "Mở",
  practice: "Luyện tập",
  startPractice: "Bắt đầu luyện tập",
  practiceTitle: "Luyện đọc",
  backToList: "Quay lại Đọc",
  backToPassage: "Quay lại đoạn văn",
  passagePanel: "Đoạn văn",
  questionsPanel: "Câu hỏi",
  questionSets: "Bộ bài tập",
  noSetsYet: "Chưa có bài tập",
  noSetsDescription:
    "Tạo bài tập một lần — chúng được lưu, nên tải lại trang sẽ không tạo lại.",
  setCount:
    "{count, plural, one {# bộ bài tập} other {# bộ bài tập}}",
  questionCountValue:
    "{count, plural, one {# câu hỏi} other {# câu hỏi}}",
  staleSet: "Đoạn văn đã cập nhật sau khi tạo bộ này",
  vocabHint:
    "Chọn một từ hoặc cụm ngắn trong đoạn văn để thêm vào Từ vựng.",
  addToVocabulary: "Thêm vào Từ vựng",
  deleteConfirmTitle: "Xóa đoạn văn này?",
  deleteConfirmDescription:
    '"{title}" và tất cả bài tập cùng lượt làm sẽ bị xóa vĩnh viễn.',
  modes: {
    multiple_choice: "Trắc nghiệm",
    written: "Trả lời viết",
    true_false_not_stated: "Đúng / Sai / Không nêu",
    mixed: "Hỗn hợp",
  },
  sources: { paste: "Dán", pdf: "PDF", docx: "DOCX" },
  setStatus: {
    generating: "Đang tạo",
    ready: "Sẵn sàng",
    failed: "Thất bại",
  },
  tfns: {
    true: "Đúng",
    false: "Sai",
    not_stated: "Không nêu",
  },
  practiceSession: {
    submit: "Nộp câu trả lời",
    loading: "Đang tải câu hỏi…",
    questionLabel: "C{number}.",
    writtenPlaceholder: "Viết câu trả lời…",
    correct: "Đúng",
    incorrect: "Chưa đúng",
    expected: "Đáp án đúng",
    objectiveScore: "{correct} / {total} câu khách quan đúng",
    mobileTabsAria: "Bảng luyện tập",
  },
  errors: {
    UNAUTHORIZED: "Đăng nhập để tiếp tục.",
    OPENAI_NOT_CONFIGURED: "AI chưa được cấu hình.",
    INVALID_INPUT: "Kiểm tra dữ liệu nhập và thử lại.",
    INVALID_FILE: "Chọn tệp PDF hoặc DOCX.",
    INVALID_FILE_TYPE: "Chỉ hỗ trợ tệp PDF và DOCX.",
    FILE_TOO_LARGE: "Tệp quá lớn. Dùng tệp dưới 10 MB.",
    EMPTY_CONTENT: "Thêm đoạn văn dài hơn (ít nhất vài câu).",
    SCANNED_PDF:
      "PDF này có vẻ là bản quét hoặc trống. PDF có lớp văn bản hoạt động tốt nhất — chưa có OCR.",
    UNSUPPORTED_PARSE:
      "Không đọc được tệp. Thử .docx hoặc PDF có lớp văn bản.",
    PASSAGE_NOT_FOUND: "Không tìm thấy bài đọc.",
    SET_NOT_FOUND: "Không tìm thấy bộ bài tập.",
    ATTEMPT_NOT_FOUND: "Không tìm thấy lượt luyện tập.",
    SET_NOT_READY: "Bài tập chưa sẵn sàng.",
    GENERATION_FAILED: "Không thể tạo bài tập. Thử lại.",
    GENERATION_UNAVAILABLE: "Tạo bài tập hiện không khả dụng.",
    VALIDATION_FAILED: "Bài tập tạo ra không dùng được. Thử lại.",
    GRADING_FAILED: "Không thể chấm câu trả lời viết. Thử lại.",
    ATTEMPT_NOT_EDITABLE: "Lượt này không còn chỉnh sửa được.",
    PROCESSING_FAILED: "Đã xảy ra lỗi. Thử lại.",
  },
};

function countLeafKeys(obj) {
  let n = 0;
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      n += countLeafKeys(v);
    } else {
      n += 1;
    }
  }
  return n;
}

function parsedReadingForValidation(obj) {
  const { practiceSession, ...rest } = obj;
  return { ...rest, practice: practiceSession };
}

function patchFile(locale, readingObj) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  let text = fs.readFileSync(filePath, "utf8");
  const blockBody = serializeReadingBlock(readingObj);
  const readingBlock = `\n  "reading": {\n${blockBody}\n  },\n  "listening": {`;
  const replaceRe =
    /\n  "reading": \{[\s\S]*?\n  \},\n  "listening": \{/;
  const insertRe = /\n  "listening": \{/;
  if (replaceRe.test(text)) {
    text = text.replace(replaceRe, readingBlock);
  } else if (insertRe.test(text)) {
    text = text.replace(insertRe, readingBlock);
  } else {
    throw new Error(
      `${locale}.json: could not find listening block to insert reading before`,
    );
  }

  JSON.parse(text);

  const data = JSON.parse(text);
  let navChanged = false;
  if (!data.nav) {
    data.nav = {};
    navChanged = true;
  }
  if (!data.nav.reading) {
    data.nav.reading = readingObj.title;
    navChanged = true;
  }
  if (!data.nav.groups) {
    data.nav.groups = {};
    navChanged = true;
  }
  if (!data.nav.groups.skills) {
    const skillsDefaults = {
      en: "Skills",
      fi: "Taidot",
      sv: "Färdigheter",
      vi: "Kỹ năng",
    };
    data.nav.groups.skills = skillsDefaults[locale] ?? "Skills";
    navChanged = true;
  }

  if (navChanged) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else {
    fs.writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
  }

  const leaf =
    countLeafKeys(parsedReadingForValidation(readingObj)) +
    1; /* string "practice" label */
  return leaf;
}

const locales = [
  ["en", readingEn],
  ["fi", readingFi],
  ["sv", readingSv],
  ["vi", readingVi],
];

const report = {};
for (const [locale, obj] of locales) {
  report[locale] = patchFile(locale, obj);
  console.log(`${locale}.json: reading namespace updated (${report[locale]} leaf keys)`);
}

console.log(JSON.stringify(report, null, 2));
