// ===============================
// PARTIE 1 : IMPORT PDF
// ===============================
const pdfInput = document.getElementById('pdf-file');
const courseTextArea = document.getElementById('course-text');
const pdfStatus = document.getElementById('pdf-status');

if (pdfInput) {
    pdfInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        pdfStatus.innerText = "⏳ Lecture du PDF...";
        courseTextArea.value = "";

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }

            courseTextArea.value = fullText;
            pdfStatus.innerText = "✅ PDF chargé !";

        } catch (error) {
            console.error(error);
            pdfStatus.innerText = "❌ Erreur PDF";
        }
    });
}

// ===============================
// PARTIE 2 : TABS
// ===============================
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
    });
});

// ===============================
// PARTIE 3 : GENERATION
// ===============================
const generateBtn = document.getElementById('generate-btn');
const summaryDisplay = document.getElementById('summary-display');
const flashcardsContainer = document.getElementById('flashcards-container');
const quizContainer = document.getElementById('quiz-container');

generateBtn.addEventListener('click', () => {
    const text = courseTextArea.value.trim();

    if (!text) {
        alert("Ajoute du texte ou un PDF !");
        return;
    }

    // RESET
    summaryDisplay.innerHTML = "⏳ Génération...";
    flashcardsContainer.innerHTML = "";
    quizContainer.innerHTML = "";

    // SIMULATION IA
    setTimeout(() => {
        generateSummary(text);
        generateFlashcards(text);
        generateQuiz(text);
    }, 1000);
});

// ===============================
// PARTIE 4 : RESUME
// ===============================
function generateSummary(text) {
    const sentences = text.split(".");
    const summary = sentences.slice(0, 3).join(".") + ".";

    summaryDisplay.innerHTML = summary || "Résumé indisponible.";
}

// ===============================
// PARTIE 5 : FLASHCARDS
// ===============================
function generateFlashcards(text) {
    const sentences = text.split(".").filter(s => s.trim().length > 20);

    sentences.slice(0, 5).forEach((sentence, index) => {
        const card = document.createElement("div");
        card.className = "flashcard";

        card.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    Question ${index + 1}
                </div>
                <div class="flashcard-back">
                    ${sentence}
                </div>
            </div>
        `;

        card.addEventListener("click", () => {
            card.classList.toggle("flipped");
        });

        flashcardsContainer.appendChild(card);
    });
}

// ===============================
// PARTIE 6 : QUIZ
// ===============================
function generateQuiz(text) {
    const sentences = text.split(".").filter(s => s.trim().length > 20);

    let current = 0;

    function showQuestion() {
        if (current >= sentences.length || current >= 5) {
            quizContainer.innerHTML = "<h3>✅ Quiz terminé !</h3>";
            return;
        }

        const correct = sentences[current];
        const fake1 = "Réponse incorrecte 1";
        const fake2 = "Réponse incorrecte 2";

        const options = shuffle([correct, fake1, fake2]);

        quizContainer.innerHTML = `
            <div class="quiz-card">
                <h3>Question ${current + 1}</h3>
                <p>Complète :</p>
                <strong>${correct.slice(0, 40)}...</strong>

                <div class="options">
                    ${options.map(opt => `<button class="opt">${opt}</button>`).join("")}
                </div>
            </div>
        `;

        document.querySelectorAll(".opt").forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.innerText === correct) {
                    btn.classList.add("correct");
                } else {
                    btn.classList.add("wrong");
                }

                setTimeout(() => {
                    current++;
                    showQuestion();
                }, 800);
            });
        });
    }

    showQuestion();
}

// ===============================
// UTIL
// ===============================
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}
