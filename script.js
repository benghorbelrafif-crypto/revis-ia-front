// --- PARTIE 1 : IMPORTATION PDF ---
const pdfInput = document.getElementById('pdf-file');
const courseTextArea = document.getElementById('course-text');
const pdfStatus = document.getElementById('pdf-status');

if (pdfInput) {
    pdfInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        pdfStatus.innerText = "⏳ Lecture du PDF en cours...";
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

            if (fullText.trim().length > 0) {
                courseTextArea.value = fullText;
                pdfStatus.innerText = "✅ PDF chargé !";
            } else {
                pdfStatus.innerText = "⚠️ PDF vide ou illisible.";
            }

        } catch (error) {
            console.error("Erreur PDF:", error);
            pdfStatus.innerText = "❌ Erreur lecture PDF.";
        }
    });
}


// --- PARTIE 2 : GÉNÉRATION IA ---
document.getElementById('generate-btn').addEventListener('click', async () => {

    const currentText = courseTextArea.value;

    const summaryDisplay = document.getElementById('summary-display');
    const flashcardsContainer = document.getElementById('flashcards-container');
    const quizContainer = document.getElementById('quiz-container');
    const btn = document.getElementById('generate-btn');

    if (!currentText || currentText.trim().length < 5) {
        return alert("Ajoute du contenu avant !");
    }

    btn.disabled = true;
    btn.innerText = "⏳ Génération...";

    try {
        const response = await fetch('https://revis-ia-back.onrender.com/generer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cours: currentText })
        });

        if (!response.ok) throw new Error("Serveur KO");

        const data = await response.json();

        console.log("DATA IA :", data); // DEBUG IMPORTANT

        // =========================
        // 1. RÉSUMÉ
        // =========================
        summaryDisplay.innerHTML = "";

        if (typeof data.resume === 'string') {
            summaryDisplay.innerText = data.resume;
        } else if (typeof data.resume === 'object' && data.resume !== null) {
            for (const [key, value] of Object.entries(data.resume)) {
                const section = document.createElement('div');
                section.innerHTML = `<h3 style="color:#6200ee;">${key}</h3><p>${value}</p>`;
                summaryDisplay.appendChild(section);
            }
        }

        // =========================
        // 2. FLASHCARDS (INTERACTIVES)
        // =========================
        flashcardsContainer.innerHTML = "";
        flashcardsContainer.classList.add("flashcards-grid");

        if (Array.isArray(data.flashcards)) {
            data.flashcards.forEach(card => {

                const flashcard = document.createElement('div');
                flashcard.classList.add('flashcard');

                flashcard.innerHTML = `
                    <div class="flashcard-inner">
                        <div class="flashcard-front">
                            ${card.question || "Question indisponible"}
                        </div>
                        <div class="flashcard-back">
                            ${card.reponse || "Réponse indisponible"}
                        </div>
                    </div>
                `;

                flashcard.addEventListener('click', () => {
                    flashcard.classList.toggle('flipped');
                });

                flashcardsContainer.appendChild(flashcard);
            });
        }

        // =========================
        // 3. QUIZ
        // =========================
        quizContainer.innerHTML = "";

        if (Array.isArray(data.quiz)) {
            data.quiz.forEach((q, index) => {

                const div = document.createElement('div');
                div.classList.add("quiz-item");

                const correct = String(q.reponse_correcte ?? "").trim();

                const optionsHTML = (q.options || []).map(opt => `
                    <button onclick="verifier(this, '${correct.replace(/'/g, "\\'")}')">
                        ${opt}
                    </button>
                `).join("");

                div.innerHTML = `
                    <p><strong>${index + 1}. ${q.question || "Question ?"}</strong></p>
                    <div class="quiz-options">
                        ${optionsHTML}
                    </div>
                    <p class="res" style="display:none; font-weight:bold;"></p>
                `;

                quizContainer.appendChild(div);
            });
        }

    } catch (error) {
        console.error(error);
        alert("❌ Erreur avec le serveur.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Générer mes révisions";
    }
});


// --- PARTIE 3 : VÉRIFICATION QUIZ ---
function verifier(btn, correct) {

    const parent = btn.parentElement.parentElement;
    const res = parent.querySelector('.res');

    res.style.display = "block";

    const userAnswer = btn.innerText.trim();

    if (userAnswer === correct) {
        res.innerText = "✅ Correct !";
        res.classList.add("correct");
    } else {
        res.innerText = "❌ Faux. Réponse : " + correct;
        res.classList.add("wrong");
    }

    parent.querySelectorAll('button').forEach(b => b.disabled = true);
}
