// --- PARTIE 1 : IMPORTATION PDF ---
const pdfInput = document.getElementById('pdf-file');
const courseTextArea = document.getElementById('course-text');
const pdfStatus = document.getElementById('pdf-status');

if (pdfInput) {
    pdfInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        pdfStatus.innerText = "⏳ Lecture du PDF en cours...";
        courseTextArea.value = ""; 

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }

            if (fullText.trim().length > 0) {
                courseTextArea.value = fullText;
                pdfStatus.innerText = "✅ PDF chargé ! Prêt à générer.";
            } else {
                pdfStatus.innerText = "⚠️ PDF vide ou illisible (image).";
            }
            
        } catch (error) {
            console.error("Erreur PDF:", error);
            pdfStatus.innerText = "❌ Erreur lors de la lecture du PDF.";
        }
    });
}

// --- PARTIE 2 : GÉNÉRATION IA ---
document.getElementById('generate-btn').addEventListener('click', async () => {
    const currentText = document.getElementById('course-text').value;
    const summaryDisplay = document.getElementById('summary-display');
    const flashcardsContainer = document.getElementById('flashcards-container');
    const quizContainer = document.getElementById('quiz-container');
    const btn = document.getElementById('generate-btn');

    if (!currentText || currentText.trim().length < 5) {
        return alert("La zone de texte est vide ! Attends que le PDF s'affiche ou colle ton cours.");
    }

    btn.disabled = true;
    btn.innerText = "L'IA travaille... ⏳";
    
    try {
        const response = await fetch('https://revis-ia-back.onrender.com/generer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cours: currentText })
        });

        if (!response.ok) throw new Error("Le serveur ne répond pas");

        const data = await response.json();

        // 1. AFFICHAGE DU RÉSUMÉ
        summaryDisplay.innerHTML = ""; 
        if (typeof data.resume === 'string') {
            summaryDisplay.innerText = data.resume;
        } else if (typeof data.resume === 'object') {
            for (const [key, value] of Object.entries(data.resume)) {
                const section = document.createElement('div');
                section.innerHTML = `<h3 style="color:#6c5ce7; margin-top:10px;">${key}</h3><p>${value}</p>`;
                summaryDisplay.appendChild(section);
            }
        }

        // 2. AFFICHAGE DES FLASHCARDS (AVEC EFFET RECTO/VERSO)
        flashcardsContainer.innerHTML = "";
        if (data.flashcards) {
            data.flashcards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'flashcard'; // Utilise le style CSS 3D
                
                cardElement.innerHTML = `
                    <div class="flashcard-inner">
                        <div class="flashcard-front">
                            ${card.question}
                        </div>
                        <div class="flashcard-back">
                            ${card.reponse}
                        </div>
                    </div>
                `;

                // INTERACTIVITÉ LUDIQUE : Retourner la carte au clic
                cardElement.addEventListener('click', () => {
                    cardElement.classList.toggle('flipped');
                });

                flashcardsContainer.appendChild(cardElement);
            });
        }

        // 3. AFFICHAGE DU QUIZ
        quizContainer.innerHTML = "";
        if (data.quiz) {
            data.quiz.forEach((q, index) => {
                const div = document.createElement('div');
                div.className = "quiz-item";
                
                let optionsHTML = q.options.map(opt => 
                    `<button onclick="verifier(this, '${q.reponse_correcte.replace(/'/g, "\\'")}')">
                        ${opt}
                    </button>`
                ).join("");
                
                div.innerHTML = `
                    <p><strong>${index + 1}. ${q.question}</strong></p>
                    <div class="quiz-options">${optionsHTML}</div>
                    <p class="res" style="display:none; font-weight:bold; margin-top:10px;"></p>
                `;
                quizContainer.appendChild(div);
            });
        }

    } catch (e) {
        console.error(e);
        alert("Erreur de connexion avec l'IA.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Générer mes révisions";
    }
});

// --- PARTIE 3 : FONCTION VÉRIFIER ---
function verifier(btn, correct) {
    const parent = btn.parentElement.parentElement; // On remonte au quiz-item
    const res = parent.querySelector('.res');
    res.style.display = "block";
    
    if (btn.innerText.trim() === correct.trim()) {
        res.innerText = "✅ Correct !";
        res.style.color = "#27ae60";
        btn.classList.add('correct');
    } else {
        res.innerText = "❌ Faux. La réponse était : " + correct;
        res.style.color = "#e74c3c";
        btn.classList.add('wrong');
    }
    
    // Désactiver tous les boutons de cette question après la réponse
    parent.querySelectorAll('button').forEach(b => b.disabled = true);
}
