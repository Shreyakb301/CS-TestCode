const fs = require('fs');
const csv = require('csv-parser');
const natural = require('natural');
const { TfIdf } = natural;

let df = []; // Dataset

// Load dataset function
function loadDataset() {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream('cheeses.csv')
            .pipe(csv())
            .on('data', (row) => data.push(row))
            .on('end', () => {
                df = data;
                resolve(df);
            })
            .on('error', (err) => reject(err));
    });
}

// Preprocess dataset for feature extraction
function preprocessData() {
    const attributesToProcess = ['milk', 'country', 'type', 'texture', 'rind', 'flavor', 'aroma', 'color'];

    df.forEach((row) => {
        attributesToProcess.forEach((attr) => {
            if (!row[attr] || row[attr] === 'NA') {
                row[attr] = 'Unknown';
            }
        });

        row['features'] = attributesToProcess.map(attr => row[attr]).join(' ');
    });
}

// Manually compute cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));

    if (magnitude1 && magnitude2) {
        return dotProduct / (magnitude1 * magnitude2);
    } else {
        return 0;
    }
}

// Fisher-Yates shuffle to randomize the recommendations
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}


// Recommend cheeses based on user preferences
function recommendBasedOnPreferences(preferences) {
    const userPrefList = Object.keys(preferences)
        .map(key => preferences[key].toLowerCase()) // Convert user preferences to lowercase
        .filter(Boolean); // Filter out empty preferences

    const userPreferences = userPrefList.join(' ');

    const tfidf = new TfIdf();
    df.forEach((row) => tfidf.addDocument(row['features']));

    const userTfidf = new TfIdf();
    userTfidf.addDocument(userPreferences);
    const userTfidfList = userTfidf.listTerms(0).map(term => term.tf);

    // First filter by user preferences
    let filteredCheeses = df.filter((row) => {
        const rowMilk = row['milk'] ? row['milk'].toLowerCase() : '';
        const rowType = row['type'] ? row['type'].toLowerCase() : '';
        const rowTexture = row['texture'] ? row['texture'].toLowerCase().split(', ') : [];
        const rowFlavor = row['flavor'] ? row['flavor'].toLowerCase().split(', ') : [];

        // Prioritize non-Unknown entries
        if (rowMilk === 'unknown' || rowType === 'unknown' || rowTexture.includes('unknown') || rowFlavor.includes('unknown')) {
            return false;
        }

        // Filter based on user preferences
        if (preferences.milk && !rowMilk.includes(preferences.milk.toLowerCase())) {
            return false;
        }

        if (preferences.type && !rowType.includes(preferences.type.toLowerCase())) {
            return false;
        }

        if (preferences.texture && !rowTexture.includes(preferences.texture.toLowerCase())) {
            return false;
        }

        if (preferences.flavor && !rowFlavor.includes(preferences.flavor.toLowerCase())) {
            return false;
        }

        return true; // Only return cheeses that match the preferences
    });

    // Now calculate cosine similarity on the filtered list
    filteredCheeses = filteredCheeses.map((row) => {
        const similarity = cosineSimilarity(userTfidfList, tfidf.listTerms(df.indexOf(row)).map(term => term.tf));

        return {
            cheeseName: row['cheese'],
            country: row['country'],
            milk: row['milk'],
            type: row['type'],
            texture: row['texture'],
            rind: row['rind'],
            flavor: row['flavor'],
            aroma: row['aroma'],
            color: row['color'],
            similarity: similarity
        };
    });

    // Sort by similarity (still prioritize user preferences)
    filteredCheeses.sort((a, b) => b.similarity - a.similarity);

    // Shuffle to introduce randomness but keep prioritized cheeses
    const shuffledRecommendations = shuffleArray(filteredCheeses);

    // Return the top 5 recommendations
    return shuffledRecommendations.slice(0, 5);
}




// Group cheeses by an attribute
function groupCheesesByAttribute(attribute) {
    const groupedCheeses = {};
    df.forEach((row) => {
        const attributeValues = row[attribute].split(', ').map(value => value.trim()).filter(value => value !== 'Unknown');
        attributeValues.forEach((value) => {
            if (!groupedCheeses[value]) {
                groupedCheeses[value] = [];
            }
            groupedCheeses[value].push(row['cheese']);
        });
    });
    return groupedCheeses;
}

// Load and preprocess the dataset on startup
loadDataset().then(() => preprocessData());

// Export functions to be used in other modules
module.exports = {
    recommendBasedOnPreferences,
    groupCheesesByAttribute
};