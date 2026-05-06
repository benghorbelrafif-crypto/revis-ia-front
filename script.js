window.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // CONFIG ELEMENTS
    // ===============================
    const maxChars = 3000;
    let score = 0; // Pour suivre le score
    let questionsRatees = []; // Liste des erreurs à repasser

    const elements = {
        courseText: document.getElementById('course-text'),
        generateBtn: document.getElementById('generate-btn'),
        summary: document.getElementById('summary-display'),
        flashcards: document.getElementById('flashcards-container'),
        quiz: document.getElementById('quiz-container'),
        charCount: document.getElementById('char-count')
    };

    // ===============================
    // GESTION DES ONGLETS (TABS)
    // ===============================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const activeContent = document.getElementById(`${targetTab}-tab`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

    // ===============================
    // COMPTEUR DE CARACTÈRES
    // ===============================
    if (elements.courseText && elements.charCount) {
        elements.courseText.addEventListener("input", () => {
            const length = elements.courseText.value.length;
            elements.charCount.innerText = `${length} / ${maxChars}`;
            elements.charCount.style.color = length > maxChars ? "red" : "black";
        });
    }

    // ===============================
    // GENERATION
    // ===============================
    elements.generateBtn?.addEventListener('click', async () => {
        const content = elements.courseText.value.trim();
        if (!content) return alert("Ajoute ton cours !");
        if (content.length > maxChars) return alert(" Texte trop long (max 3000)");

        elements.generateBtn.disabled = true;
        elements.generateBtn.innerText = "Génération par SuccessLab IA...";

        try {
            const response = await fetch('https://revis-ia-back.onrender.com/generer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cours: content })
            });

            if (!response.ok) throw new Error("Erreur serveur");
            const data = await response.json();

            // Réinitialisation pour un nouveau cours
            score = 0;
            questionsRatees = [];

            renderResume(data.resume);
            renderFlashcards(data.flashcards || []);
            renderQuiz(data.quiz || []);

        } catch (err) {
            alert(" Erreur serveur Render !");
        } finally {
            elements.generateBtn.disabled = false;
            elements.generateBtn.innerText = "Générer mes révisions";
        }
    });

    // ===============================
    // RESUME
    // ===============================
    function renderResume(resume) {
        elements.summary.innerHTML = "";
        if (!Array.isArray(resume)) {
            elements.summary.innerText = "Résumé indisponible.";
            return;
        }
        resume.forEach(part => {
            const div = document.createElement("div");
            div.className = "resume-part";
            div.innerHTML = `
                <h3>${part.titre}</h3>
                <p>${part.resume}</p>
                <ul>
                    ${(part.points_cles || []).map(p => `<li>${p}</li>`).join("")}
                </ul>
            `;
            elements.summary.appendChild(div);
        });
    }

    // ===============================
    // FLASHCARDS
    // ===============================
    function renderFlashcards(cards) {
        elements.flashcards.innerHTML = "";
        cards.forEach(card => {
            const div = document.createElement("div");
            div.className = "flashcard";
            div.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <small> QUESTION</small>
                        <p><strong>${card.question}</strong></p>
                    </div>
                    <div class="flashcard-back">
                        <small> RÉPONSE </small>
                        <p style="opacity:0.8;"> ${card.question}</p>
                        <hr>
                        <p>${card.reponse}</p>
                    </div>
                </div>
            `;
            div.addEventListener("click", () => div.classList.toggle("flipped"));
            elements.flashcards.appendChild(div);
        });
    }

    // ===============================
    // QUIZ (LOGIQUE DE RATTRAPAGE AJOUTÉE)
    // ===============================
    function renderQuiz(questions, isRetry = false) {
        if (!isRetry) {
            elements.quiz.innerHTML = ""; // Vide seulement au premier tour
            score = 0;
            questionsRatees = [];
        }

        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, "").trim();
        let reponsesCount = 0;

        questions.forEach((q, i) => {
            const correct = String(q.reponse_correcte || "").trim();
            const shuffled = [...(q.options || [])].sort(() => Math.random() - 0.5);

            const div = document.createElement("div");
            div.className = "quiz-card";
            div.innerHTML = `
                <h3>${isRetry ? "Rattrapage" : "Question"} ${i + 1}</h3>
                <p>${q.question}</p>
                <div class="options">
                    ${shuffled.map(opt => `<button class="opt">${opt}</button>`).join("")}
                </div>
                <p class="res" style="display:none; margin-top:10px; font-weight:bold;"></p>
                <small class="explication" style="display:none; color:gray;"></small>
            `;

            div.querySelectorAll('.opt').forEach(btn => {
                btn.onclick = () => {
                    const res = div.querySelector('.res');
                    const exp = div.querySelector('.explication');
                    res.style.display = "block";
                    exp.style.display = "block";
                    reponsesCount++;

                    if (normalize(btn.innerText) === normalize(correct)) {
                        btn.classList.add("correct");
                        res.innerText = "Bonne réponse";
                        if (!isRetry) score++; // On compte le score seulement au 1er passage
                    } else {
                        btn.classList.add("wrong");
                        res.innerText = "Faux. Réponse : " + correct;
                        if (!questionsRatees.includes(q)) questionsRatees.push(q);
                    }

                    exp.innerText = q.explication || "";
                    div.querySelectorAll('.opt').forEach(b => b.disabled = true);

                    // Si c'est la dernière question du tour actuel
                    if (reponsesCount === questions.length) {
                        setTimeout(() => handleQuizEnd(questions.length), 1500);
                    }
                };
            });
            elements.quiz.appendChild(div);
        });
    }

    function handleQuizEnd(totalTour) {
        if (questionsRatees.length > 0) {
            const confirmRetry = confirm(`Fin du tour ! Score : ${score}. Tu as fait ${questionsRatees.length} erreur(s). On les retente ?`);
            if (confirmRetry) {
                const aRepasser = [...questionsRatees];
                questionsRatees = []; // On vide pour le tour suivant
                elements.quiz.innerHTML = `<h2 style="text-align:center; color:#6366f1;">🚀 Rattrapage : On corrige tes erreurs !</h2>`;
                renderQuiz(aRepasser, true);
            } else {
                showFinalScore(totalTour);
            }
        } else {
            alert("Félicitations ! Tu as tout bon.");
            showFinalScore(totalTour);
        }
    }

    function showFinalScore(total) {
        elements.quiz.innerHTML = `
            <div style="text-align:center; padding:20px; background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <h2>Quiz Terminé ! 🏁</h2>
                <p style="font-size:1.4rem;">Score final : <strong>${score}</strong></p>
                <button onclick="location.reload()" class="generate-btn" style="margin-top:20px; width:auto; padding:10px 20px;">Recommencer tout</button>
            </div>
        `;
    }
});
