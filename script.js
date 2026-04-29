window.addEventListener("DOMContentLoaded", () => {
    // --- CONFIG PDF ---
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    const elements = {
        pdfInput: document.getElementById('pdf-file'),
        courseText: document.getElementById('course-text'),
        pdfStatus: document.getElementById('pdf-status'),
        generateBtn: document.getElementById('generate-btn'),
        summary: document.getElementById('summary-display'),
        flashcards: document.getElementById('flashcards-container'),
        quiz: document.getElementById('quiz-container')
    };

    // --- ONGLETS ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab + '-tab');
            if (target) target.classList.add('active');
        });
    });

    // --- LECTURE PDF ---
    elements.pdfInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        elements.pdfStatus.innerText = "⏳ Lecture...";
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ") + "\n";
            }
            elements.courseText.value = text;
            elements.pdfStatus.innerText = "✅ PDF chargé !";
        } catch (err) {
            elements.pdfStatus.innerText = "❌ Erreur PDF";
        }
    });

    // --- GENERER ---
    elements.generateBtn?.addEventListener('click', async () => {
        const content = elements.courseText.value.trim();
        if (!content) return alert("Ajoute ton cours !");

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

    // --- RESUME ---
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

    // --- FLASHCARDS ---
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
                </div>`;

            div.onclick = () => div.classList.toggle("flipped");
            elements.flashcards.appendChild(div);
        });
    }

    // --- QUIZ FIX (IMPORTANT) ---
    function renderQuiz(questions) {
        elements.quiz.innerHTML = "";

        const normalize = (str) =>
            str?.toLowerCase().replace(/\s+/g, "").replace(/\)/g, "").trim();

        questions.forEach((q, i) => {
            const correct = String(q.reponse_correcte || "").trim();

            // 🔥 shuffle des réponses (IMPORTANT)
            const shuffled = [...q.options].sort(() => Math.random() - 0.5);

            const div = document.createElement("div");
            div.className = "quiz-card";

            div.innerHTML = `
                <h3>Question ${i + 1}</h3>
                <p>${q.question}</p>

                <div class="options">
                    ${shuffled.map(opt => `<button class="opt">${opt}</button>`).join("")}
                </div>

                <p class="res" style="display:none; margin-top:10px; font-weight:bold;"></p>
                <small class="explication" style="display:none; color:gray; margin-top:5px;"></small>
            `;

            div.querySelectorAll('.opt').forEach(btn => {
                btn.onclick = () => {
                    const res = div.querySelector('.res');
                    const exp = div.querySelector('.explication');

                    res.style.display = "block";
                    exp.style.display = "block";

                    const explanation = q.explication || "";

                    if (normalize(btn.innerText) === normalize(correct)) {
                        btn.classList.add("correct");
                        res.innerHTML = "✅ Bonne réponse";
                        exp.innerText = explanation;
                    } else {
                        btn.classList.add("wrong");
                        res.innerHTML = "❌ Mauvaise réponse. Bonne réponse : " + correct;
                        exp.innerText = explanation;
                    }

                    div.querySelectorAll('.opt').forEach(b => b.disabled = true);
                };
            });

            elements.quiz.appendChild(div);
        });
    }
});
