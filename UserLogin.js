const express = require('express');
const fs = require('fs');
const path = require('path');
const { recommendBasedOnPreferences, groupCheesesByAttribute } = require('./CheeseAI');
const app = express();
const port = 1000;

app.use(express.json());
app.use(express.json());
// Store users in memory
let users = [];

// Load users from file
function loadUsersFromFile() {
    try {
        const data = fs.readFileSync('UserInfo.txt', 'utf8');
        users = data
            .split('\n')
            .filter(Boolean) // Remove empty lines
            .map(line => {
                const parts = line.split(',');
                if (parts.length !== 2) {
                    console.warn(`Skipping malformed line: ${line}`);
                    return null; // Skip invalid lines
                }
                return { username: parts[0].trim(), password: parts[1].trim() };
            })
            .filter(user => user !== null);
        console.log("Loaded users:", users);
    } catch (error) {
        console.error("Error reading users file:", error);
    }
}

// Create a new user and save to file
function createUser(username, password) {
    const user = { username, password };
    users.push(user);
    fs.appendFileSync('UserInfo.txt', `\n${username},${password}`);
    console.log("User registered:", user);
}

// Login function
function login(username, password) {
    console.log("Attempting login with:", username, password);
    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        console.log("Login successful for:", username);
    } else {
        console.log("Login failed for:", username);
    }
    return !!user;
}

// Load users at server start
loadUsersFromFile();



// Serve the frontend HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Loginpage.html'));
});

// Redirect to index.html after successful login
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register endpoint
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Check if both username and password are provided
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    // Check if the username already exists
    const userExists = users.some(user => user.username === username);
    if (userExists) {
        return res.status(400).send('Username already exists. Please choose a different username.');
    }

    // If username doesn't exist, create a new user
    createUser(username, password);
    res.send('User registered successfully.');
});


// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }
    if (login(username, password)) {
        res.send('Login successful.');
    } else {
        res.status(401).send('Invalid username or password.');
    }
});

// POST route to handle cheese recommendations
app.post('/recommend', (req, res) => {
    const preferences = req.body;
    const recommendations = recommendBasedOnPreferences(preferences);

    console.log('User Preferences:', preferences); // Log user preferences
    console.log('Recommendations:', recommendations); // Log recommendations

    // Add URL to each recommendation (dynamic URL based on cheeseName)
    const recommendationsWithUrls = recommendations.map(recommendation => {
        recommendation.url = `/cheese/${recommendation.cheeseName.replace(/\s+/g, '-').toLowerCase()}`;
        return recommendation;
    });

    res.json({
        preferences: preferences,
        recommendations: recommendations
    });
});

// POST route to handle cheese grouping by attribute
app.post('/group', (req, res) => {
    const { attribute } = req.body; // Get the attribute to group by from the request body
    if (!attribute) {
        return res.status(400).json({ error: 'Attribute is required' });
    }



    res.json({
        attribute: attribute,
        groupedCheeses: groupedCheeses
    });
});

// Redirect to after-login page after successful login
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/classify.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'classify.html'));
});


// POST route to handle URL generation for a specific cheese
app.post('/generate-cheese-url', (req, res) => {
    const { cheeseName } = req.body;  // Extract cheese name from the request body

    // Check if cheeseName is provided
    if (!cheeseName) {
        return res.status(400).json({ error: 'Cheese name is required' });
    }

    // Here, we're assuming we create a URL like /cheese/{cheeseName} for each cheese
    const url = `/cheese/${encodeURIComponent(cheeseName)}`;

    console.log('Generated URL for', cheeseName, ':', url); // Log the generated URL

    res.json({
        cheeseName: cheeseName,
        url: url
    });
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
