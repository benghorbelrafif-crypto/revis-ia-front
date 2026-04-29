window.addEventListener("DOMContentLoaded", () => {

    // --- CONFIGURATION PDF ---
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    const pdfInput = document.getElementById('pdf-file');
    const courseTextArea = document.getElementById('course-text');
    const pdfStatus = document.getElementById('pdf-status');
    const generateBtn = document.getElementById('generate-btn');
    const summaryDisplay = document.getElementById('summary-display');
    const flashcardsContainer = document.getElementById('flashcards-container');
    const quizContainer = document.getElementById('quiz-container');

    // --- GESTION DU PDF ---
    if (pdfInput) {
        pdfInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            pdfStatus.innerText = "⏳ Lecture du PDF...";
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(" ") + "\n";
                }
                courseTextArea.value = fullText;
                pdfStatus.innerText = "✅ PDF chargé !";
            } catch (error) {
                pdfStatus.innerText = "❌ Erreur PDF";
            }
        });
    }

    // --- GESTION DES ONGLETS (TABS) ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.tab + '-tab';
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- APPEL À L'IA (BOUTON GÉNÉRER) ---
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const text = courseTextArea.value.trim();
            if (!text || text.length < 10) {
                alert("Colle un cours plus long pour que l'IA puisse travailler !");
                return;
            }

            // État de chargement
            generateBtn.disabled = true;
            generateBtn.innerText = "⏳ L'IA analyse ton cours...";
            summaryDisplay.innerHTML = "L'IA rédige le résumé...";
            flashcardsContainer.innerHTML = "Génération des questions...";

            try {
                // APPEL AU BACKEND RENDER
                const response = await fetch('https://revis-ia-back.onrender.com/generer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cours: text })
                });

                if (!response.ok) throw new Error("Serveur en sommeil");

                const data = await response.json();

                // 1. AFFICHAGE DU RÉSUMÉ
                summaryDisplay.innerHTML = data.resume || "Résumé indisponible.";

                // 2. AFFICHAGE DES FLASHCARDS (Recto/Verso)
                renderFlashcards(data.flashcards);

                // 3. AFFICHAGE DU QUIZ
                renderQuiz(data.quiz);

            } catch (error) {
                console.error(error);
                alert("Le serveur Render se réveille... Re-clique sur Générer dans 10 secondes !");
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerText = "Générer mes révisions";
            }
        });
    }

    // --- FONCTION FLASHCARDS ---
    function renderFlashcards(cards) {
        flashcardsContainer.innerHTML = "";
        if (!cards || cards.length === 0) {
            flashcardsContainer.innerHTML = "Aucune flashcard générée.";
            return;
        }

        cards.forEach(card => {
            const div = document.createElement("div");
            div.className = "flashcard";
            div.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <p style="font-size: 0.8rem; opacity: 0.7;">🧠 QUESTION</p>
                        <strong>${card.question}</strong>
                        <p style="margin-top: 15px; font-size: 0.7rem;">(Clique pour voir la réponse)</p>
                    </div>
                    <div class="flashcard-back">
                        <p style="font-size: 0.8rem; opacity: 0.7;">📘 RÉPONSE</p>
                        <div>${card.reponse}</div>
                    </div>
                </div>
            `;
            div.addEventListener("click", () => div.classList.toggle("flipped"));
            flashcardsContainer.appendChild(div);
        });
    }

    // --- FONCTION QUIZ ---
    function renderQuiz(questions) {
        quizContainer.innerHTML = "";
        if (!questions) return;

        questions.forEach((q, index) => {
            const correct = String(q.reponse_correcte || "").trim();
            const quizDiv = document.createElement("div");
            quizDiv.className = "quiz-card";
            quizDiv.style.marginBottom = "20px";
            
            quizDiv.innerHTML = `
                <h3>Question ${index + 1}</h3>
                <p>${q.question}</p>
                <div class="options" id="opts-${index}">
                    ${q.options.map(opt => `<button class="opt">${opt}</button>`).join("")}
                </div>
                <p class="feedback-${index}" style="margin-top:10px; font-weight:bold;"></p>
            `;

            quizContainer.appendChild(quizDiv);

            const buttons = quizDiv.querySelectorAll('.opt');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const feedback = quizDiv.querySelector(`.feedback-${index}`);
                    if (btn.innerText.trim() === correct) {
                        btn.classList.add("correct");
                        feedback.innerText = "✅ Excellent !";
                    } else {
                        btn.classList.add("wrong");
                        feedback.innerText = "❌ Non. La réponse était : " + correct;
                    }
                    quizDiv.querySelectorAll('.opt').forEach(b => b.disabled = true);
                });
            });
        });
    }
});
