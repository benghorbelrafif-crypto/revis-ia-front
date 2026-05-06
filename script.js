window.addEventListener("DOMContentLoaded", () => { // Attend que toute la page HTML soit chargée
    
    // CONFIG ELEMENTS
    const maxChars = 3000; // Nombre maximum de caractères autorisés
    let score = 0; // Pour suivre le score du quiz
    let questionsRatees = []; // Liste des questions ratées pour les refaire

    // Récupération des éléments HTML importants
    const elements = {
        courseText: document.getElementById('course-text'), // Zone de texte
        generateBtn: document.getElementById('generate-btn'), // Bouton générer
        summary: document.getElementById('summary-display'), // Zone résumé
        flashcards: document.getElementById('flashcards-container'), // Zone flashcards
        quiz: document.getElementById('quiz-container'), // Zone quiz
        charCount: document.getElementById('char-count') // Compteur de caractères
    };

    // GESTION DES ONGLETS (TABS)
    const tabBtns = document.querySelectorAll('.tab-btn'); // Tous les boutons d’onglets
    const tabContents = document.querySelectorAll('.tab-content'); // Tous les contenus d’onglets

    tabBtns.forEach(btn => { // Pour chaque bouton d’onglet
        btn.addEventListener('click', () => { // Quand on clique dessus
            const targetTab = btn.getAttribute('data-tab'); // Récupère l’onglet ciblé

            tabBtns.forEach(b => b.classList.remove('active')); // Désactive tous les boutons
            tabContents.forEach(c => c.classList.remove('active')); // Cache tous les contenus

            btn.classList.add('active'); // Active le bouton cliqué

            const activeContent = document.getElementById(`${targetTab}-tab`); // Récupère le contenu associé
            if (activeContent) {
                activeContent.classList.add('active'); // Affiche le bon contenu
            }
        });
    });

    // COMPTEUR DE CARACTÈRES
    if (elements.courseText && elements.charCount) { // Vérifie que les éléments existent
        elements.courseText.addEventListener("input", () => { // À chaque saisie
            const length = elements.courseText.value.length; // Longueur du texte
            elements.charCount.innerText = `${length} / ${maxChars}`; // Met à jour l’affichage
            elements.charCount.style.color = length > maxChars ? "red" : "black"; // Rouge si dépassement
        });
    }

    // GENERATION
    elements.generateBtn?.addEventListener('click', async () => { // Clique sur le bouton générer
        const content = elements.courseText.value.trim(); // Récupère le texte sans espaces inutiles

        if (!content) return alert("Ajoute ton cours !"); // Vérifie si vide
        if (content.length > maxChars) return alert(" Texte trop long (max 3000)"); // Vérifie taille

        elements.generateBtn.disabled = true; // Désactive bouton pendant chargement
        elements.generateBtn.innerText = "Génération par SuccessLab IA..."; // Texte temporaire

        try {
            // Envoi du cours à l’API backend
            const response = await fetch('https://revis-ia-back.onrender.com/generer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // Format JSON
                body: JSON.stringify({ cours: content }) // Données envoyées
            });

            if (!response.ok) throw new Error("Erreur serveur"); // Vérifie réponse

            const data = await response.json(); // Récupère les données JSON

            // Réinitialisation pour un nouveau cours
            score = 0;
            questionsRatees = [];

            // Affiche les résultats
            renderResume(data.resume);
            renderFlashcards(data.flashcards || []);
            renderQuiz(data.quiz || []);

        } catch (err) {
            alert(" Erreur serveur Render !"); // Message d’erreur
        } finally {
            elements.generateBtn.disabled = false; // Réactive bouton
            elements.generateBtn.innerText = "Générer mes révisions"; // Texte normal
        }
    });

    // RESUME
    function renderResume(resume) {
        elements.summary.innerHTML = ""; // Vide le contenu actuel

        if (!Array.isArray(resume)) { // Vérifie si c’est un tableau
            elements.summary.innerText = "Résumé indisponible."; // Message si erreur
            return;
        }

        resume.forEach(part => { // Pour chaque partie du résumé
            const div = document.createElement("div"); // Crée un bloc
            div.className = "resume-part"; // Classe CSS

            // Contenu HTML du résumé
            div.innerHTML = `
                <h3>${part.titre}</h3>
                <p>${part.resume}</p>
                <ul>
                    ${(part.points_cles || []).map(p => `<li>${p}</li>`).join("")}
                </ul>
            `;

            elements.summary.appendChild(div); // Ajoute au DOM
        });
    }

    // FLASHCARDS
    function renderFlashcards(cards) {
        elements.flashcards.innerHTML = ""; // Vide les anciennes flashcards

        cards.forEach(card => { // Pour chaque carte
            const div = document.createElement("div"); // Crée une carte
            div.className = "flashcard";

            // Structure HTML de la carte (recto/verso)
            div.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <small> QUESTION</small>
                        <p><strong>${card.question}</strong></p>
                    </div>
                    <div class="flashcard-back">
                        <small> RÉPONSE </small>
                        <p style="opacity:0.8;"> ${card.question}</p>
                        <hr>
                        <p>${card.reponse}</p>
                    </div>
                </div>
            `;

            // Permet de retourner la carte au clic
            div.addEventListener("click", () => div.classList.toggle("flipped"));

            elements.flashcards.appendChild(div); // Ajoute au DOM
        });
    }

    // QUIZ 
    function renderQuiz(questions, isRetry = false) {
        if (!isRetry) {
            elements.quiz.innerHTML = ""; // Vide seulement au premier tour
            score = 0; // Reset score
            questionsRatees = []; // Reset erreurs
        }

        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, "").trim(); // Normalise texte
        let reponsesCount = 0; // Compteur de réponses

        questions.forEach((q, i) => { // Pour chaque question
            const correct = String(q.reponse_correcte || "").trim(); // Bonne réponse

            // Mélange les options
            const shuffled = [...(q.options || [])].sort(() => Math.random() - 0.5);

            const div = document.createElement("div"); // Carte question
            div.className = "quiz-card";

            // HTML de la question
            div.innerHTML = `
                <h3>${isRetry ? "Rattrapage" : "Question"} ${i + 1}</h3>
                <p>${q.question}</p>
                <div class="options">
                    ${shuffled.map(opt => `<button class="opt">${opt}</button>`).join("")}
                </div>
                <p class="res" style="display:none; margin-top:10px; font-weight:bold;"></p>
                <small class="explication" style="display:none; color:gray;"></small>
            `;

            // Gestion des réponses
            div.querySelectorAll('.opt').forEach(btn => {
                btn.onclick = () => {
                    const res = div.querySelector('.res'); // Zone résultat
                    const exp = div.querySelector('.explication'); // Zone explication

                    res.style.display = "block";
                    exp.style.display = "block";
                    reponsesCount++;

                    if (normalize(btn.innerText) === normalize(correct)) { // Bonne réponse
                        btn.classList.add("correct");
                        res.innerText = "Bonne réponse";
                        if (!isRetry) score++; // Compte score seulement au 1er passage
                    } else { // Mauvaise réponse
                        btn.classList.add("wrong");
                        res.innerText = "Faux. Réponse : " + correct;

                        if (!questionsRatees.includes(q)) questionsRatees.push(q); // Ajoute aux erreurs
                    }

                    exp.innerText = q.explication || ""; // Affiche explication

                    div.querySelectorAll('.opt').forEach(b => b.disabled = true); // Désactive boutons

                    // Si toutes les questions sont répondues
                    if (reponsesCount === questions.length) {
                        setTimeout(() => handleQuizEnd(questions.length), 1500);
                    }
                };
            });

            elements.quiz.appendChild(div); // Ajoute question au DOM
        });
    }

    // Gestion fin de quiz
    function handleQuizEnd(totalTour) {
        if (questionsRatees.length > 0) { // S’il y a des erreurs
            const confirmRetry = confirm(`Fin du tour ! Score : ${score}. Tu as fait ${questionsRatees.length} erreur(s). On les retente ?`);

            if (confirmRetry) { // Si utilisateur veut recommencer
                const aRepasser = [...questionsRatees];
                questionsRatees = [];

                elements.quiz.innerHTML = `<h2 style="text-align:center; color:#6366f1;">🚀 Rattrapage : On corrige tes erreurs !</h2>`;

                renderQuiz(aRepasser, true); // Relance avec erreurs
            } else {
                showFinalScore(totalTour); // Sinon score final
            }
        } else {
            alert("Félicitations ! Tu as tout bon."); // Aucun erreur
            showFinalScore(totalTour);
        }
    }

    // Affichage score final
    function showFinalScore(total) {
        elements.quiz.innerHTML = `
            <div style="text-align:center; padding:20px; background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <h2>Quiz Terminé ! 🏁</h2>
                <p style="font-size:1.4rem;">Score final : <strong>${score}</strong></p>
                <button onclick="location.reload()" class="generate-btn" style="margin-top:20px; width:auto; padding:10px 20px;">Recommencer tout</button>
            </div>
        `;
    }
});
