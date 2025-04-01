document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('inscriptionForm');
    const conferenceOui = document.getElementById('conference-oui');
    const conferenceDetails = document.getElementById('conference-details');
    const confirmation = document.getElementById('confirmation');
    const whatsappLink = document.getElementById('whatsappLink');
    const inscriptionCount = document.getElementById('inscriptionCount');
    
    // Charger le nombre d'inscriptions
    fetch('/api/inscriptions/count')
        .then(response => response.json())
        .then(data => {
            inscriptionCount.textContent =77 + data.count ;
        })
        .catch(error => {
            console.error('Erreur:', error);
            inscriptionCount.textContent = '100+'; // Valeur par défaut
        });
    
    // Afficher/masquer les détails de conférence
    document.querySelectorAll('input[name="conference"]').forEach(radio => {
        radio.addEventListener('change', function() {
            conferenceDetails.classList.toggle('hidden', !document.getElementById('conference-oui').checked);
        });
    });
    
    // Gestion de la soumission du formulaire
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validation
        if (!validateForm()) {
            return;
        }
        
        // Récupération des données
        const formData = {
            nom: document.getElementById('nom').value.trim(),
            prenom: document.getElementById('prenom').value.trim(),
            email: document.getElementById('email').value.trim(),
            age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null,
            profession: document.getElementById('profession').value.trim(),
            pays: document.getElementById('pays').value,
            ville: document.getElementById('ville').value.trim(),
            revenu: document.getElementById('revenu').value,
            conference: document.querySelector('input[name="conference"]:checked').value,
            conferenceDescription: document.getElementById('conference-description').value.trim(),
            programmeur: document.getElementById('programmeur').checked
        };
        
        try {
            // Envoi des données au serveur
            const response = await fetch('/api/inscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de l\'inscription');
            }
            
            // Mise à jour du compteur
            const countResponse = await fetch('/api/inscriptions/count');
            const countData = await countResponse.json();
            inscriptionCount.textContent = 77 + countData.count;
            
            // Affichage de la confirmation
            form.classList.add('hidden');
            confirmation.classList.remove('hidden');
            window.scrollTo(0, 0);
            
        } catch (error) {
            alert(error.message);
            console.error('Erreur:', error);
        }
    });
    
    // Validation du formulaire
    function validateForm() {
        let isValid = true;
        
        // Réinitialiser les erreurs
        document.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });
        
        // Validation des champs obligatoires
        const requiredFields = ['nom', 'prenom', 'email', 'pays'];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            }
        });
        
        // Validation email
        const email = document.getElementById('email');
        if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            email.classList.add('error');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Mettre à jour le lien WhatsApp (vous pouvez le modifier plus tard)
    whatsappLink.href = "https://chat.whatsapp.com/IRJZ8RS6az44J60i9KmOAc";
});