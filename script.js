window.addEventListener("DOMContentLoaded", () => {

    const maxChars = 3000;
    const API_URL = "https://revis-ia-back.onrender.com/generer";

    const elements = {
        courseText: document.getElementById('course-text'),
        generateBtn: document.getElementById('generate-btn'),
        summary: document.getElementById('summary-display'),
        flashcards: document.getElementById('flashcards-container'),
        quiz: document.getElementById('quiz-container'),
        charCount: document.getElementById('char-count')
    };

    // ===============================
    // PROTECTION DOM
    // ===============================
    if (!elements.courseText || !elements.generateBtn || !elements.summary || !elements.flashcards || !elements.quiz) {
        console.error("❌ Éléments HTML manquants");
        return;
    }

    // ===============================
    // COMPTEUR DE CARACTÈRES
    // ===============================
    elements.courseText.addEventListener("input", () => {
        const length = elements.courseText.value.length;
        if (elements.charCount) {
            elements.charCount.innerText = `${length} / ${maxChars}`;
            elements.charCount.style.color = length > maxChars ? "red" : "black";
        }
    });

    // ===============================
    // GESTION DES ONGLETS (TABS)
    // ===============================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Désactiver tous les boutons et cacher les contenus
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activer le bouton cliqué et l'onglet correspondant
            btn.classList.add('active');
            const activeContent = document.getElementById(`${targetTab}-tab`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

    // ===============================
    // GÉNÉRATION VIA API
    // ===============================
    elements.generateBtn.addEventListener('click', async () => {
        const content = elements.courseText.value.trim();

        if (!content) return alert("Ajoute ton cours !");
        if (content.length > maxChars) return alert("Texte trop long");

        elements.generateBtn.disabled = true;
        elements.generateBtn.innerText = "⏳ IA...";

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cours: content })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("API ERROR:", response.status, errText);
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Affichage des données
            renderResume(data.resume);
            renderFlashcards(data.flashcards || []);
            renderQuiz(data.quiz || []);

        } catch (err) {
            console.error("Fetch error:", err);
            // Si tu vois cette alerte, vérifie ta clé API sur Render
            alert("⚠️ Erreur serveur / Clé API invalide sur Render");
        } finally {
            elements.generateBtn.disabled = false;
            elements.generateBtn.innerText = "Générer mes révisions";
        }
    });

    // ===============================
    // RENDU DU RÉSUMÉ
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
                <h3>${part.titre || "Sans titre"}</h3>
                <p>${part.resume || ""}</p>
                <ul>
                    ${(part.points_cles || []).map(p => `<li>${p}</li>`).join('')}
                </ul>
            `;
            elements.summary.appendChild(div);
        });
    }

    // ===============================
    // RENDU DES FLASHCARDS
    // ===============================
    function renderFlashcards(cards) {
        elements.flashcards.innerHTML = "";
        if (cards.length === 0) {
            elements.flashcards.innerHTML = "<p>Aucune flashcard générée.</p>";
            return;
        }

        cards.forEach(card => {
            const div = document.createElement("div");
            div.className = "flashcard";
            div.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <small>🧠 QUESTION</small>
                        <p><strong>${card.question || ""}</strong></p>
                    </div>
                    <div class="flashcard-back">
                        <small>📘 RÉPONSE</small>
                        <p>${card.reponse || ""}</p>
                    </div>
                </div>
            `;
            div.addEventListener("click", () => div.classList.toggle("flipped"));
            elements.flashcards.appendChild(div);
        });
    }

    // ===============================
    // RENDU DU QUIZ
    // ===============================
    function renderQuiz(questions) {
        elements.quiz.innerHTML = "";
        if (questions.length === 0) {
            elements.quiz.innerHTML = "<p>Aucun quiz généré.</p>";
            return;
        }

        let score = 0;
        let index = 0;

        const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");

        function showQuestion() {
            if (index >= questions.length) {
                elements.quiz.innerHTML = `
                    <div style="text-align:center;padding:20px;">
                        <h2>🏁 Quiz terminé</h2>
                        <h3>🏆 Score : ${score} / ${questions.length}</h3>
                    </div>
                `;
                return;
            }

            const q = questions[index];
            const options = [...(q.options || [])].sort(() => Math.random() - 0.5);

            elements.quiz.innerHTML = `
                <div class="quiz-card">
                    <h3>Question ${index + 1}</h3>
                    <p>${q.question || ""}</p>
                    <div class="options">
                        ${options.map(o => `<button class="opt">${o}</button>`).join("")}
                    </div>
                    <p class="res" style="display:none;"></p>
                </div>
                <div style="margin-top:10px;font-weight:bold;">Score : ${score}</div>
            `;

            elements.quiz.querySelectorAll(".opt").forEach(btn => {
                btn.addEventListener("click", () => {
                    const res = elements.quiz.querySelector(".res");
                    res.style.display = "block";
                    
                    const isCorrect = normalize(btn.innerText) === normalize(q.reponse_correcte);
                    
                    if (isCorrect) {
                        btn.classList.add("correct");
                        res.innerText = "✅ Bonne réponse !";
                        score++;
                    } else {
                        btn.classList.add("wrong");
                        res.innerText = `❌ Faux : ${q.reponse_correcte}`;
                    }

                    elements.quiz.querySelectorAll(".opt").forEach(b => b.disabled = true);
                    setTimeout(() => { index++; showQuestion(); }, 1200);
                });
            });
        }
        showQuestion();
    }
});
