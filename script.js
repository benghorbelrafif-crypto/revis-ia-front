window.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // CONFIG ELEMENTS
    // ===============================
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
    // COMPTEUR DE CARACTÈRES
    // ===============================
    if (elements.courseText && elements.charCount) {
        elements.courseText.addEventListener("input", () => {
            const length = elements.courseText.value.length;
            elements.charCount.innerText = `${length} / ${maxChars}`;

            // limite visuelle
            if (length > maxChars) {
                elements.charCount.style.color = "red";
            } else {
                elements.charCount.style.color = "black";
            }
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
    // FLASHCARDS (RECTO = QUESTION / VERSO = REPONSE)
    // ===============================
    function renderFlashcards(cards) {

        elements.flashcards.innerHTML = "";

        cards.forEach(card => {

            const div = document.createElement("div");
            div.className = "flashcard";

            div.innerHTML = `
                <div class="flashcard-inner">

                    <!-- RECTO -->
                    <div class="flashcard-front">
                        <small>🧠 QUESTION</small>
                        <p><strong>${card.question}</strong></p>
                    </div>

                    <!-- VERSO -->
                    <div class="flashcard-back">
                        <small>📘 RÉPONSE</small>

                        <p style="opacity:0.8;">❓ ${card.question}</p>
                        <hr>

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
    // QUIZ
    // ===============================
    function renderQuiz(questions) {

        elements.quiz.innerHTML = "";

        const normalize = (str) =>
            str?.toLowerCase().replace(/\s+/g, "").trim();

        questions.forEach((q, i) => {

            const correct = String(q.reponse_correcte || "").trim();
            const shuffled = [...(q.options || [])].sort(() => Math.random() - 0.5);

            const div = document.createElement("div");
            div.className = "quiz-card";

            div.innerHTML = `
                <h3>Question ${i + 1}</h3>
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

                    if (normalize(btn.innerText) === normalize(correct)) {
                        btn.classList.add("correct");
                        res.innerText = "✅ Bonne réponse";
                        exp.innerText = q.explication || "";
                    } else {
                        btn.classList.add("wrong");
                        res.innerText = "❌ Faux. Réponse : " + correct;
                        exp.innerText = q.explication || "";
                    }

                    div.querySelectorAll('.opt').forEach(b => b.disabled = true);
                };
            });

            elements.quiz.appendChild(div);
        });
    }

});
