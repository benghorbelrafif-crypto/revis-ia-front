// --- PARTIE 1 : IMPORTATION PDF ---
const pdfInput = document.getElementById('pdf-file');
const courseTextArea = document.getElementById('course-text');
const pdfStatus = document.getElementById('pdf-status');

if (pdfInput) {
    pdfInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        pdfStatus.innerText = "⏳ Lecture du PDF en cours...";
        // On vide la case avant de commencer pour éviter les conflits
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

            // --- MODIFICATION ICI ---
            if (fullText.trim().length > 0) {
                courseTextArea.value = fullText; // On insère le texte
                pdfStatus.innerText = "✅ PDF chargé ! Prêt à générer.";
                console.log("Texte extrait :", fullText.substring(0, 100) + "..."); 
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
    // MODIFICATION ICI : On récupère la valeur EXACTE au moment du clic
    const currentText = document.getElementById('course-text').value;
    
    const summaryDisplay = document.getElementById('summary-display');
    const flashcardsContainer = document.getElementById('flashcards-container');
    const quizContainer = document.getElementById('quiz-container');
    const btn = document.getElementById('generate-btn');

    // On vérifie si la variable contient bien du texte
    if (!currentText || currentText.trim().length < 5) {
        return alert("La zone de texte est vide ! Attends que le PDF s'affiche ou colle ton cours.");
    }

    btn.disabled = true;
    btn.innerText = "L'IA travaille... ⏳";
    
    try {
        const response = await fetch('https://revis-ia-back.onrender.com/generer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cours: currentText }) // On envoie le texte actuel
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
                section.innerHTML = `<h3 style="color:#6200ee; margin-top:10px;">${key}</h3><p>${value}</p>`;
                summaryDisplay.appendChild(section);
            }
        }

        // 2. AFFICHAGE DES FLASHCARDS
        flashcardsContainer.innerHTML = "";
        if (data.flashcards) {
            data.flashcards.forEach(card => {
                const div = document.createElement('div');
                div.style.padding = "10px";
                div.style.borderBottom = "1px solid #eee";
                div.innerHTML = `<p><strong>Q:</strong> ${card.question}</p><p><strong>R:</strong> ${card.reponse}</p>`;
                flashcardsContainer.appendChild(div);
            });
        }

        // 3. AFFICHAGE DU QUIZ
        quizContainer.innerHTML = "";
        if (data.quiz) {
            data.quiz.forEach((q, index) => {
                const div = document.createElement('div');
                div.className = "card";
                div.style.marginBottom = "15px";
                
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
