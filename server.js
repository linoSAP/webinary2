// Importation des modules nécessaires
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Création de l'application Express
const app = express();

// Configuration de la sécurité avec Helmet
app.use(helmet());

// Middleware pour parser les requêtes JSON et URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Limite de taux pour les routes sensibles
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives max
    handler: (req, res) => {
        res.status(429).send('Trop de tentatives de connexion, veuillez réessayer plus tard');
    }
});

// Connexion à la base de données SQLite
const  dbPath = process.env.NODE_ENV === 'production' 
? '/tmp/inscriptions.db'  // Chemin compatible Vercel
: path.join(__dirname, 'database', 'inscriptions.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.message);
    } else {
        console.log('Connecté à la base de données SQLite');
        
        // Création de la table si elle n'existe pas
        db.run(`CREATE TABLE IF NOT EXISTS inscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            age INTEGER,
            profession TEXT,
            pays TEXT NOT NULL,
            ville TEXT,
            revenu TEXT,
            conference TEXT,
            conference_description TEXT,
            programmeur INTEGER,
            date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erreur lors de la création de la table:', err.message);
            } else {
                console.log('Table "inscriptions" prête');
            }
        });
    }
});


// Mot de passe hashé (à générer avec generate-hash.js)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2a$10$nkVsuqHsrJOOyM4ahZBILeT3.s4iGfxrmGRmd7OKk2I3/Pk2AKtTi';

// Routes publiques
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour enregistrer une inscription
app.post('/api/inscription', (req, res) => {
    const { nom, prenom, email, age, profession, pays, ville, revenu, conference, conferenceDescription, programmeur } = req.body;

    // Validation
    if (!nom || !prenom || !email || !pays) {
        return res.status(400).json({ error: 'Les champs obligatoires sont manquants' });
    }

    const sql = `INSERT INTO inscriptions (
        nom, prenom, email, age, profession, pays, ville, 
        revenu, conference, conference_description, programmeur
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        nom,
        prenom,
        email,
        age || null,
        profession || null,
        pays,
        ville || null,
        revenu || null,
        conference || 'non',
        conferenceDescription || null,
        programmeur ? 1 : 0
    ];

    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Cet email est déjà inscrit' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Inscription réussie' });
    });
});

// Routes d'authentification
app.get('/admin/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SEO</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
                .login-box { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 300px; }
                h1 { text-align: center; color: #333; margin-bottom: 1.5rem; }
                input { width: 100%; padding: 0.8rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
                button { width: 100%; padding: 0.8rem; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
                button:hover { background-color: #45a049; }
                .error { color: red; margin-top: 1rem; text-align: center; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h1>SEO</h1>
                <form method="POST" action="/admin/login">
                    <input type="password" name="password" placeholder="Mot de passe" required>
                    <button type="submit">Se connecter</button>
                </form>
                ${req.query.error ? '<p class="error">Mot de passe incorrect</p>' : ''}
            </div>
        </body>
        </html>
    `);
});

app.post('/admin/login', loginLimiter, (req, res) => {
    const { password } = req.body;
    
    if (bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        res.redirect('/adminlino');
    } else {
        res.redirect('/admin/login?error=1');
    }
});

app.get('/admin/logout', (req, res) => {
    res.redirect('/admin/login');
});

// Routes protégées
app.get('/adminlino', (req, res) => {
    db.all('SELECT * FROM inscriptions ORDER BY date_inscription DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Erreur de base de données');
        }
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin - Webinaire</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    h1 { color: #333; }
                    .header { display: flex; justify-content: space-between; align-items: center; }
                    .logout-btn { background: #f44336; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; }
                    .logout-btn:hover { background: #d32f2f; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .total { font-weight: bold; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Inscriptions au webinaire (${rows.length})</h1>
                    <a href="/admin/logout" class="logout-btn">Déconnexion</a>
                </div>
                <table>
                    <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Pays</th>
                        <th>Date</th>
                        <th>Programmeur</th>
                    </tr>
                    ${rows.map(row => `
                        <tr>
                            <td>${row.prenom} ${row.nom}</td>
                            <td>${row.email}</td>
                            <td>${row.pays}</td>
                            <td>${new Date(row.date_inscription).toLocaleString()}</td>
                            <td>${row.programmeur ? 'Oui' : 'Non'}</td>
                        </tr>
                    `).join('')}
                </table>
                <div class="total">Total: ${rows.length} inscriptions</div>
            </body>
            </html>
        `);
    });
});

app.get('/api/inscriptions', (req, res) => {
    db.all('SELECT * FROM inscriptions ORDER BY date_inscription DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/inscriptions/count', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM inscriptions', [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ count: row.count });
    });
});


// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Gestion des erreurs
app.use((req, res) => {
    res.status(404).send('Page non trouvée');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Une erreur est survenue');
});

// Port d'écoute
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});