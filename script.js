window.addEventListener("DOMContentLoaded", () => {
    // Configuration PDF
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

    // Gestion des Onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
        });
    });

    // Lecture PDF
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
            elements.pdfStatus.innerText = "✅ Chargé !";
        } catch (err) { elements.pdfStatus.innerText = "❌ Erreur PDF"; }
    });

    // Clic sur Générer
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

            // Affichage
            elements.summary.innerHTML = data.resume || "Pas de résumé.";
            renderFlashcards(data.flashcards);
            renderQuiz(data.quiz);

        } catch (err) {
            alert("Le serveur Render se réveille... Attends 10 secondes et reclique !");
        } finally {
            elements.generateBtn.disabled = false;
            elements.generateBtn.innerText = "Générer mes révisions";
        }
    });

    function renderFlashcards(cards) {
        elements.flashcards.innerHTML = "";
        cards?.forEach(card => {
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

    function renderQuiz(questions) {
        elements.quiz.innerHTML = "";
        questions?.forEach((q, i) => {
            const correct = String(q.reponse_correcte || "").trim();
            const div = document.createElement("div");
            div.className = "quiz-card";
            div.innerHTML = `
                <h3>Question ${i+1}</h3>
                <p>${q.question}</p>
                <div class="options">
                    ${q.options.map(opt => `<button class="opt">${opt}</button>`).join("")}
                </div>
                <p class="res" style="display:none; margin-top:10px; font-weight:bold;"></p>`;
            
            div.querySelectorAll('.opt').forEach(btn => {
                btn.onclick = () => {
                    const res = div.querySelector('.res');
                    res.style.display = "block";
                    if (btn.innerText.trim() === correct) {
                        btn.classList.add("correct");
                        res.innerText = "✅ Bravo !";
                    } else {
                        btn.classList.add("wrong");
                        res.innerText = "❌ Mauvais. C'était : " + correct;
                    }
                    div.querySelectorAll('.opt').forEach(b => b.disabled = true);
                };
            });
            elements.quiz.appendChild(div);
        });
    }
});
