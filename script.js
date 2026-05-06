window.addEventListener("DOMContentLoaded", () => { // Déclenche le script une fois que le HTML est chargé

    // CONFIG ELEMENTS (Initialisation des variables globales)
    const maxChars = 3000; // Limite de caractères pour l'input
    let score = 0; // Variable pour stocker les bonnes réponses
    let questionsRatees = []; // Tableau qui va stocker les objets "questions" mal répondues

    // Objet regroupant les accès au DOM (éléments HTML)
    const elements = {
        courseText: document.getElementById('course-text'),
        generateBtn: document.getElementById('generate-btn'),
        summary: document.getElementById('summary-display'),
        flashcards: document.getElementById('flashcards-container'),
        quiz: document.getElementById('quiz-container'),
        charCount: document.getElementById('char-count')
    };

    // GESTION DES ONGLETS (Navigation fluide entre Résumé, Quiz, etc.)
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab'); // Récupère le nom de l'onglet cliqué
            
            // On retire la classe "active" de tous les boutons et contenus
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // On active uniquement le bouton cliqué
            btn.classList.add('active');
            
            // On affiche le contenu correspondant à l'ID cible
            const activeContent = document.getElementById(`${targetTab}-tab`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

    // COMPTEUR DE CARACTÈRES (Interface en temps réel)
    if (elements.courseText && elements.charCount) {
        elements.courseText.addEventListener("input", () => {
            const length = elements.courseText.value.length;
            elements.charCount.innerText = `${length} / ${maxChars}`;
            // Change la couleur en rouge si l'utilisateur dépasse la limite
            elements.charCount.style.color = length > maxChars ? "red" : "black";
        });
    }

    // GENERATION (Appel à l'API Intelligence Artificielle)
    elements.generateBtn?.addEventListener('click', async () => {
        const content = elements.courseText.value.trim();
        
        // Sécurité : Vérifie si le champ est vide ou trop long
        if (!content) return alert("Ajoute ton cours !");
        if (content.length > maxChars) return alert(" Texte trop long (max 3000)");

        // État de chargement du bouton
        elements.generateBtn.disabled = true;
        elements.generateBtn.innerText = "Génération par SuccessLab IA...";

        try {
            // Envoi des données vers ton backend sur Render
            const response = await fetch('https://revis-ia-back.onrender.com/generer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cours: content })
            });

            if (!response.ok) throw new Error("Erreur serveur");
            const data = await response.json(); // Récupération des données JSON générées

            // Reset des scores avant d'afficher les nouveaux résultats
            score = 0;
            questionsRatees = [];

            // Appel des fonctions d'affichage avec les données reçues
            renderResume(data.resume);
            renderFlashcards(data.flashcards || []);
            renderQuiz(data.quiz || []);

        } catch (err) {
            alert(" Erreur serveur Render !");
        } finally {
            // Remise à l'état initial du bouton après la génération
            elements.generateBtn.disabled = false;
            elements.generateBtn.innerText = "Générer mes révisions";
        }
    });

    // RESUME (Affichage dynamique du contenu texte)
    function renderResume(resume) {
        elements.summary.innerHTML = ""; // Vide la zone de chargement
        if (!Array.isArray(resume)) {
            elements.summary.innerText = "Résumé indisponible.";
            return;
        }
        resume.forEach(part => {
            const div = document.createElement("div");
            div.className = "resume-part";
            // Injection du titre, du texte et de la liste à puces (points clés)
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

    // FLASHCARDS (Cartes réversibles)

    function renderFlashcards(cards) {
        elements.flashcards.innerHTML = "";
        cards.forEach(card => {
            const div = document.createElement("div");
            div.className = "flashcard";
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
            // Ajout du mécanisme de retournement au clic via une classe CSS
            div.addEventListener("click", () => div.classList.toggle("flipped"));
            elements.flashcards.appendChild(div);
        });
    }

    // QUIZ (Logique interactive et vérification)
    function renderQuiz(questions, isRetry = false) {
        if (!isRetry) {
            elements.quiz.innerHTML = ""; // Reset de la zone si c'est un nouveau quiz
            score = 0;
            questionsRatees = [];
        }

        // Fonction de nettoyage des chaînes pour faciliter la comparaison des textes
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, "").trim();
        let reponsesCount = 0; // Suivi du nombre de questions répondues

        questions.forEach((q, i) => {
            const correct = String(q.reponse_correcte || "").trim();
            // Mélange aléatoire des options pour ne pas avoir la réponse toujours au même endroit
            const shuffled = [...(q.options || [])].sort(() => Math.random() - 0.5);

            const div = document.createElement("div");
            div.className = "quiz-card";
            div.innerHTML = `
                <h3>${isRetry ? "Rattrapage" : "Question"} ${i + 1}</h3>
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
                    res.style.display = "block"; // Affiche le message de résultat
                    exp.style.display = "block"; // Affiche l'explication pédagogique
                    reponsesCount++;

                    // Comparaison normalisée entre le clic et la réponse correcte
                    if (normalize(btn.innerText) === normalize(correct)) {
                        btn.classList.add("correct"); // Style vert
                        res.innerText = "Bonne réponse";
                        if (!isRetry) score++; // Incrémente le score seulement au premier essai
                    } else {
                        btn.classList.add("wrong"); // Style rouge
                        res.innerText = "Faux. Réponse : " + correct;
                        // Enregistre la question dans la liste des erreurs pour le rattrapage
                        if (!questionsRatees.includes(q)) questionsRatees.push(q);
                    }

                    exp.innerText = q.explication || "";
                    // Désactive les autres boutons après le choix pour éviter de changer d'avis
                    div.querySelectorAll('.opt').forEach(b => b.disabled = true);

                    // Si toutes les questions ont été traitées, on appelle la fin du quiz
                    if (reponsesCount === questions.length) {
                        setTimeout(() => handleQuizEnd(questions.length), 1500);
                    }
                };
            });
            elements.quiz.appendChild(div);
        });
    }

    // Gestion de la transition vers le rattrapage ou le score final
    function handleQuizEnd(totalTour) {
        if (questionsRatees.length > 0) {
            const confirmRetry = confirm(`Fin du tour ! Score : ${score}. Tu as fait ${questionsRatees.length} erreur(s). On les retente ?`);
            if (confirmRetry) {
                const aRepasser = [...questionsRatees];
                questionsRatees = []; // On vide le tableau pour le prochain tour de rattrapage
                elements.quiz.innerHTML = `<h2 style="text-align:center; color:#6366f1;">🚀 Rattrapage : On corrige tes erreurs !</h2>`;
                renderQuiz(aRepasser, true); // Relance le quiz uniquement avec les erreurs
            } else {
                showFinalScore(totalTour);
            }
        } else {
            alert("Félicitations ! Tu as tout bon.");
            showFinalScore(totalTour);
        }
    }

    // Affichage de l'écran de fin
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
