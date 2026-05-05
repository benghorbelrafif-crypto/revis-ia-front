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
    // COMPTEUR CARACTÈRES
    // ===============================
    if (elements.courseText && elements.charCount) {
        elements.courseText.addEventListener("input", () => {
            const length = elements.courseText.value.length;
            elements.charCount.innerText = `${length} / ${maxChars}`;
            elements.charCount.style.color = length > maxChars ? "red" : "black";
        });
    }

    // ===============================
    // GENERATION IA
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

            if (!response.ok) throw new Error();

            const data = await response.json();

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
                        <small>🧠 QUESTION</small>
                        <p><strong>${card.question}</strong></p>
                    </div>

                    <div class="flashcard-back">
                        <small>📘 RÉPONSE</small>
                        <p style="opacity:0.8;">❓ ${card.question}</p>
                        <hr>
                        <p>${card.reponse}</p>
                    </div>

                </div>
            `;

            div.onclick = () => div.classList.toggle("flipped");

            elements.flashcards.appendChild(div);
        });
    }

    // ===============================
    // QUIZ AVEC SCORE + REPRISE ERREURS
    // ===============================
    function renderQuiz(questions) {

        elements.quiz.innerHTML = "";

        let score = 0;
        let total = questions.length;

        let currentIndex = 0;
        let wrongQuestions = [];

        const normalize = (str) =>
            str?.toLowerCase().replace(/\s+/g, "").trim();

        function showQuestion(list) {

            if (currentIndex >= list.length) {

                if (wrongQuestions.length > 0) {
                    list = wrongQuestions;
                    wrongQuestions = [];
                    currentIndex = 0;
                } else {
                    elements.quiz.innerHTML = `
                        <div style="text-align:center;padding:20px;">
                            <h2>🏁 Quiz terminé !</h2>
                            <h3>🏆 Score final : ${score} / ${total}</h3>
                            <p>${score === total ? "🔥 Parfait !" : "📚 Revois les erreurs pour progresser !"}</p>
                        </div>
                    `;
                    return;
                }
            }

            const q = list[currentIndex];

            const correct = String(q.reponse_correcte || "").trim();
            const shuffled = [...(q.options || [])].sort(() => Math.random() - 0.5);

            elements.quiz.innerHTML = `
                <div class="quiz-card">

                    <h3>Question ${currentIndex + 1}</h3>
                    <p>${q.question}</p>

                    <div class="options">
                        ${shuffled.map(opt => `<button class="opt">${opt}</button>`).join("")}
                    </div>

                    <p class="res" style="display:none; margin-top:10px; font-weight:bold;"></p>
                    <small class="explication" style="display:none; color:gray;"></small>
                </div>

                <div style="margin-top:15px;font-weight:bold;">
                    🏆 Score : ${score} / ${total}
                </div>
            `;

            document.querySelectorAll('.opt').forEach(btn => {
                btn.onclick = () => {

                    const res = document.querySelector('.res');
                    const exp = document.querySelector('.explication');

                    res.style.display = "block";
                    exp.style.display = "block";

                    const isCorrect =
                        normalize(btn.innerText) === normalize(correct);

                    if (isCorrect) {
                        btn.classList.add("correct");
                        res.innerText = "✅ Bonne réponse";
                        exp.innerText = q.explication || "";
                        score++;
                    } else {
                        btn.classList.add("wrong");
                        res.innerText = "❌ Faux. Réponse : " + correct;
                        exp.innerText = q.explication || "";
                        wrongQuestions.push(q);
                    }

                    document.querySelectorAll('.opt').forEach(b => b.disabled = true);

                    setTimeout(() => {
                        currentIndex++;
                        showQuestion(list);
                    }, 1000);
                };
            });
        }

        showQuestion(questions);
    }

});
