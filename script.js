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
                pdfStatus.innerText = "⚠️ PDF vide ou illisible.";
            }
        } catch (error) {
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
        return alert("La zone de texte est vide !");
    }

    btn.disabled = true;
    btn.innerText = "L'IA travaille... ⏳";
    
    try {
        const response = await fetch('https://revis-ia-back.onrender.com/generer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cours: currentText })
        });

        const data = await response.json();

        // 1. RÉSUMÉ
        summaryDisplay.innerHTML = ""; 
        if (typeof data.resume === 'string') {
            summaryDisplay.innerText = data.resume;
        } else {
            for (const [key, value] of Object.entries(data.resume)) {
                summaryDisplay.innerHTML += `<h3 style="color:#6c5ce7;">${key}</h3><p>${value}</p>`;
            }
        }

        // 2. FLASHCARDS (Le nouveau design interactif)
        flashcardsContainer.innerHTML = "";
        data.flashcards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'flashcard';
            cardDiv.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">${card.question}</div>
                    <div class="flashcard-back">${card.reponse}</div>
                </div>`;
            cardDiv.onclick = () => cardDiv.classList.toggle('flipped');
            flashcardsContainer.appendChild(cardDiv);
        });

        // 3. QUIZ (Retour à la version qui marchait pour toi)
        quizContainer.innerHTML = "";
        data.quiz.forEach((q, index) => {
            const div = document.createElement('div');
            div.style.marginBottom = "20px";
            div.style.padding = "15px";
            div.style.border = "1px solid #eee";
            div.style.borderRadius = "8px";

            let optionsHTML = q.options.map(opt => 
                `<button onclick="verifier(this, '${q.reponse_correcte.replace(/'/g, "\\'")}')" 
                         style="display:block; width:100%; margin:5px 0; padding:10px; cursor:pointer; background:white; border:1px solid #ccc; border-radius:5px;">
                    ${opt}
                </button>`
            ).join("");
            
            div.innerHTML = `
                <p><strong>${index + 1}. ${q.question}</strong></p>
                ${optionsHTML}
                <p class="res" style="display:none; font-weight:bold; margin-top:10px;"></p>
            `;
            quizContainer.appendChild(div);
        });

    } catch (e) {
        alert("Erreur de connexion.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Générer mes révisions";
    }
});

// --- PARTIE 3 : FONCTION VÉRIFIER ---
function verifier(btn, correct) {
    const parent = btn.parentElement;
    const res = parent.querySelector('.res');
    res.style.display = "block";
    
    if (btn.innerText.trim() === correct.trim()) {
        res.innerText = "✅ Correct !";
        res.style.color = "green";
        btn.style.backgroundColor = "#d4edda";
    } else {
        res.innerText = "❌ Faux. La réponse était : " + correct;
        res.style.color = "red";
        btn.style.backgroundColor = "#f8d7da";
    }
    parent.querySelectorAll('button').forEach(b => b.disabled = true);
}
