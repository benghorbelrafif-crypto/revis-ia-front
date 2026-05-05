window.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // CONFIG ELEMENTS
    // ===============================
    const maxChars = 3000;
    let score = 0; // Variable pour le score
    let questionsRatees = []; // Tableau pour stocker les erreurs
    let modeRattrapage = false; // Pour savoir si on repasse les erreurs

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
        if (content.length > maxChars) return alert("⚠️ Texte trop long (max 3000)");

        elements.generateBtn.disabled = true;
        elements.generateBtn.innerText = "⏳ L'IA travaille...";

        try {
            const response = await fetch('https://revis-ia-back.onrender.com/generer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cours: content })
            });

            if (!response.ok) throw new Error("Erreur serveur");
            const data = await response.json();

            // Reset des variables de jeu lors d'une nouvelle génération
            score = 0;
            questionsRatees = [];
            modeRattrapage = false;

            renderResume(data.resume);
            renderFlashcards(data.flashcards || []);
            renderQuiz(data.quiz || []);

        } catch (err) {
            alert("⚠️ Erreur serveur Render !");
        } finally {
            elements.generateBtn.disabled = false;
            elements.generateBtn.innerText = "Générer mes révisions";
        }
    });

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
                <ul>${(part.points_cles || []).map(p => `<li>${p}</li>`).join("")}</ul>
            `;
            elements.summary.appendChild(div);
        });
    }

    function renderFlashcards(cards) {
        elements.flashcards.innerHTML = "";
        cards.forEach(card => {
            const div = document.createElement("div");
            div.className = "flashcard";
            div.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <small>🧠 QUESTION</small>
                        <p><strong>${card.question}</strong></p>
                    </div>
                    <div class="flashcard-back">
                        <small>📘 RÉPONSE</small>
                        <p style="opacity:0.8;">❓ ${card.question}</p>
                        <hr><p>${card.reponse}</p>
                    </div>
                </div>
            `;
            div.addEventListener("click", () => div.classList.toggle("flipped"));
            elements.flashcards.appendChild(div);
        });
    }

    // ===============================
    // QUIZ (LOGIQUE MODIFIÉE)
    // ===============================
    function renderQuiz(questions, isRetry = false) {
        if (!isRetry) elements.quiz.innerHTML = ""; // On ne vide que si c'est le début

        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, "").trim();
        let reponsesDonnees = 0;
        const totalAAtteindre = questions.length;

        questions.forEach((q, i) => {
            const correct = String(q.reponse_correcte || "").trim();
            const shuffled = [...(q.options || [])].sort(() => Math.random() - 0.5);

            const div = document.createElement("div");
            div.className = "quiz-card";
            // Si on est en mode rattrapage, on l'indique
            const title = isRetry ? `Rattrapage - Erreur n°${i + 1}` : `Question ${i + 1}`;

            div.innerHTML = `
                <h3>${title}</h3>
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
                    reponsesDonnees++;

                    if (normalize(btn.innerText) === normalize(correct)) {
                        btn.classList.add("correct");
                        res.innerText = "✅ Bonne réponse !";
                        if (!isRetry) score++; // On ne compte le score que le premier tour
                    } else {
                        btn.classList.add("wrong");
                        res.innerText = "❌ Faux. La réponse était : " + correct;
                        // On ajoute aux erreurs si ce n'est pas déjà dans la liste
                        if (!questionsRatees.includes(q)) {
                            questionsRatees.push(q);
                        }
                    }

                    exp.innerText = q.explication || "";
                    div.querySelectorAll('.opt').forEach(b => b.disabled = true);

                    // Quand toutes les questions de la liste actuelle sont répondues
                    if (reponsesDonnees === totalAAtteindre) {
                        setTimeout(() => checkNextStep(questions.length), 1500);
                    }
                };
            });
            elements.quiz.appendChild(div);
        });
    }

    function checkNextStep(totalQuestionsInit) {
        if (questionsRatees.length > 0) {
            const continuer = confirm(`Tour terminé. Score : ${score}. Tu as fait ${questionsRatees.length} erreurs. On les retente ?`);
            if (continuer) {
                const aReposer = [...questionsRatees];
                questionsRatees = []; // On vide pour le nouveau tour de rattrapage
                elements.quiz.innerHTML = `<div class="info-retry">🚀 C'est parti pour le rattrapage (${aReposer.length} questions)</div>`;
                renderQuiz(aReposer, true);
            } else {
                finirQuiz(totalQuestionsInit);
            }
        } else {
            alert("Bravo ! Tu as corrigé toutes tes erreurs.");
            finirQuiz(totalQuestionsInit);
        }
    }

    function finirQuiz(total) {
        elements.quiz.innerHTML = `
            <div class="quiz-final">
                <h2>Quiz terminé ! 🏁</h2>
                <p style="font-size: 1.5rem;">Ton score final : <strong>${score} / ${total}</strong></p>
                <button class="tab-btn active" onclick="location.reload()" style="margin-top:20px;">Recommencer tout</button>
            </div>
        `;
    }
});
