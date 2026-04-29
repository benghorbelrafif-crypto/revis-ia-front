window.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // CONFIG PDF.JS
    // ===============================
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    const elements = {
        pdfInput: document.getElementById('pdf-file'),
        courseText: document.getElementById('course-text'),
        pdfStatus: document.getElementById('pdf-status'),
        generateBtn: document.getElementById('generate-btn'),
        summary: document.getElementById('summary-display'),
        flashcards: document.getElementById('flashcards-container'),
        quiz: document.getElementById('quiz-container')
    };

    // ===============================
    // GESTION DES ONGLETS (TABS)
    // ===============================
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Désactiver tout
            document.querySelectorAll('.tab-btn, .tab-content')
                .forEach(el => el.classList.remove('active'));

            // Activer l'onglet cliqué
            btn.classList.add('active');
            const targetId = btn.dataset.tab + '-tab';
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // ===============================
    // IMPORTATION DU PDF
    // ===============================
    elements.pdfInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        elements.pdfStatus.innerText = "⏳ Lecture du PDF...";

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
            console.error("Erreur PDF:", err);
            elements.pdfStatus.innerText = "❌ Erreur de lecture PDF";
        }
    });

    // ===============================
    // BOUTON GÉNÉRER (APPEL IA)
    // ===============================
    elements.generateBtn?.addEventListener('click', async () => {
        const content = elements.courseText.value.trim();
        if (!content || content.length < 20) {
            return alert("Le contenu est trop court pour être analysé.");
        }

        elements.generateBtn.disabled = true;
        elements.generateBtn.innerText = "⏳ L'IA travaille...";

        try {
            const response = await fetch(
                'https://revis-ia-back.onrender.com/generer',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cours: content })
                }
            );

            if (!response.ok) throw new Error("Erreur Serveur (500)");

            const data = await response.json();

            // Affichage des résultats
            elements.summary.innerHTML = data.resume || "Résumé indisponible.";
            renderFlashcards(data.flashcards || []);
            renderQuiz(data.quiz || []);

        } catch (err) {
            console.error(err);
            alert("⚠️ Le serveur Render met du temps à répondre. Réessaie dans 10 secondes.");
        } finally {
            elements.generateBtn.disabled = false;
            elements.generateBtn.innerText = "Générer mes révisions";
        }
    });

    // ===============================
    // FONCTION FLASHCARDS (RECTO/VERSO)
    // ===============================
    function renderFlashcards(cards) {
        elements.flashcards.innerHTML = "";

        if (!cards || cards.length === 0) {
            elements.flashcards.innerHTML = "<p>Aucune flashcard disponible.</p>";
            return;
        }

        cards.forEach(card => {
            const question = card.question || "Pas de question";
            const answer = card.reponse || "Pas de réponse";

            const div = document.createElement("div");
            div.className = "flashcard";

            div.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <small>🧠 QUESTION</small>
                        <p><strong>${question}</strong></p>
                        <p style="font-size:0.7rem; margin-top:10px; opacity:0.6;">(Clique pour retourner)</p>
                    </div>
                    <div class="flashcard-back">
                        <small>📘 RÉPONSE</small>
                        <p style="font-size:0.8rem; opacity:0.7;">❓ ${question}</p>
                        <hr style="margin: 10px 0; border:0; border-top:1px solid rgba(255,255,255,0.3);">
                        <p>${answer}</p>
                    </div>
                </div>
            `;

            div.addEventListener("click", () => div.classList.toggle("flipped"));
            elements.flashcards.appendChild(div);
        });
    }

    // ===============================
    // FONCTION QUIZ (CORRECTION FIXÉE)
    // ===============================
    function renderQuiz(questions) {
        elements.quiz.innerHTML = "";

        if (!questions || questions.length === 0) {
            elements.quiz.innerHTML = "<p>Aucun quiz disponible.</p>";
            return;
        }

        questions.forEach((q, i) => {
            // Sécurité : on transforme la réponse en String pour éviter le crash .trim()
            const correct = q.reponse_correcte ? String(q.reponse_correcte).trim() : "";

            const div = document.createElement("div");
            div.className = "quiz-card";
            div.style.marginBottom = "20px";

            div.innerHTML = `
                <h3>Question ${i + 1}</h3>
                <p>${q.question || "Pas de question"}</p>
                <div class="options">
                    ${(q.options || []).map(opt =>
                        `<button class="opt">${opt}</button>`
                    ).join("")}
                </div>
                <p class="res" style="display:none; margin-top:10px; font-weight:bold;"></p>
            `;

            div.querySelectorAll('.opt').forEach(btn => {
                btn.addEventListener('click', () => {
                    const resText = div.querySelector('.res');
                    resText.style.display = "block";

                    if (btn.innerText.trim() === correct) {
                        btn.classList.add("correct");
                        resText.innerText = "✅ Bonne réponse !";
                        resText.style.color = "#10b981";
                    } else {
                        btn.classList.add("wrong");
                        resText.innerText = `❌ Erreur. La réponse était : ${correct}`;
                        resText.style.color = "#ef4444";
                    }

                    // Désactiver les autres boutons après le clic
                    div.querySelectorAll('.opt').forEach(b => b.disabled = true);
                });
            });

            elements.quiz.appendChild(div);
        });
    }
});
