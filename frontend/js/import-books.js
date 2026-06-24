const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Configurar para conectar ao EMULADOR e não ao banco real
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
    projectId: 'vivaleve258' // Deve ser o mesmo do seu firebase-config.js
});

const db = admin.firestore();
const jsonPath = path.join(__dirname, '..', 'json', 'livros.json');

async function importData() {
    try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`Lidos ${data.length} livros do arquivo JSON.`);

        const batch = db.batch();
        const collectionRef = db.collection('books');

        data.forEach((book) => {
            // Removemos o ID numérico do JSON para deixar o Firestore gerar um ID único ou usamos o slug
            const docRef = collectionRef.doc();
            batch.set(docRef, {
                ...book,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log('✅ Sucesso: Dados importados para o Firestore Emulator!');
    } catch (error) {
        console.error('❌ Erro na importação:', error);
    }
}

importData();