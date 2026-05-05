window.addEventListener("DOMContentLoaded", () => {

    const maxChars = 3000;

    const elements = {
        courseText: document.getElementById('course-text'),
        generateBtn: document.getElementById('generate-btn'),
        summary: document.getElementById('summary-display'),
        flashcards: document.getElementById('flashcards-container'),
        quiz: document.getElementById('quiz-container'),
        charCount: document.getElementById('char-count')
    };

    // ===============================
    // COMPTEUR
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
        if (content.length > maxChars) return alert("Texte trop long");

        elements.generateBtn.disabled = true;
        elements.generateBtn.innerText = "⏳ IA...";

        try {
            const response = await fetch('https://revis-ia-back.onrender.com/generer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cours: content })
            });

            if (!response.ok) throw new Error();

            const data = await response.json();

            renderResume(data.resume);
            renderFlashcards(data.flashcards || []);
            renderQuiz(data.quiz || []);

        } catch (err) {
            alert("⚠️ Erreur serveur");
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
    // FLASHCARDS (OK)
    // ===============================
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
                        <p>${card.reponse}</p>
                    </div>

                </div>
            `;

            div.addEventListener("click", () => {
                div.classList.toggle("flipped");
            });

            elements.flashcards.appendChild(div);
        });
    }

    // ===============================
    // QUIZ FIX + SCORE + ERREURS
    // ===============================
    function renderQuiz(questions) {

        elements.quiz.innerHTML = "";

        let score = 0;
        let index = 0;
        let wrong = [];

        const normalize = (str) =>
            str?.toLowerCase().replace(/\s+/g, "").trim();

        function show() {

            const list = index < questions.length ? questions : wrong;

            if (index >= list.length) {

                if (wrong.length > 0) {
                    questions = wrong;
                    wrong = [];
                    index = 0;
                } else {
                    elements.quiz.innerHTML = `
                        <div style="text-align:center;padding:20px;">
                            <h2>🏁 Quiz terminé</h2>
                            <h3>🏆 Score : ${score} / ${questions.length}</h3>
                        </div>
                    `;
                    return;
                }
            }

            const q = list[index];

            const correct = q.reponse_correcte;
            const options = [...q.options].sort(() => Math.random() - 0.5);

            elements.quiz.innerHTML = `
                <div class="quiz-card">
                    <h3>Question ${index + 1}</h3>
                    <p>${q.question}</p>

                    <div class="options">
                        ${options.map(o => `<button class="opt">${o}</button>`).join("")}
                    </div>

                    <p class="res" style="display:none;"></p>
                    <small class="explication" style="display:none;"></small>
                </div>

                <div style="margin-top:10px;font-weight:bold;">
                    Score : ${score}
                </div>
            `;

            elements.quiz.querySelectorAll(".opt").forEach(btn => {

                btn.addEventListener("click", () => {

                    const res = elements.quiz.querySelector(".res");
                    const exp = elements.quiz.querySelector(".explication");

                    res.style.display = "block";
                    exp.style.display = "block";

                    const ok = normalize(btn.innerText) === normalize(correct);

                    if (ok) {
                        btn.classList.add("correct");
                        res.innerText = "✅ Bonne réponse";
                        score++;
                    } else {
                        btn.classList.add("wrong");
                        res.innerText = "❌ Faux : " + correct;
                        wrong.push(q);
                    }

                    elements.quiz.querySelectorAll(".opt")
                        .forEach(b => b.disabled = true);

                    setTimeout(() => {
                        index++;
                        show();
                    }, 800);
                });
            });
        }

        show();
    }
});
