require('dotenv').config();
const express = require('express');
const GhostAdminAPI = require('@tryghost/admin-api');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Ghost Admin API
let api;

try {
    if (process.env.GHOST_URL && process.env.GHOST_ADMIN_KEY) {
        api = new GhostAdminAPI({
            url: process.env.GHOST_URL,
            key: process.env.GHOST_ADMIN_KEY,
            version: 'v5.0'
        });
        console.log('Ghost Admin API initialized.');
    } else {
        console.warn('WARNING: GHOST_URL or GHOST_ADMIN_KEY not found in environment.');
    }
} catch (err) {
    console.error('Error initializing Ghost Admin API:', err);
}

/**
 * Endpoint: POST /api/label-member
 * Body: { email: 'user@example.com', label: 'label-name' }
 */
app.post('/api/label-member', async (req, res) => {
    if (!api) {
        return res.status(500).json({ error: 'Ghost API not configured' });
    }

    const { email, label } = req.body;

    if (!email || !label) {
        return res.status(400).json({ error: 'Email and label are required' });
    }

    try {
        // 1. Check if member exists
        const members = await api.members.browse({ filter: `email:'${email}'` });

        if (members && members.length > 0) {
            // Member exists - Update them
            const member = members[0];
            const currentLabels = member.labels || [];

            // Check if label already exists to avoid duplicates (though Ghost might handle this, better to be safe)
            const hasLabel = currentLabels.some(l => l.name === label);

            if (!hasLabel) {
                // Format labels for update: API typically accepts an array of objects {name: 'string'}
                // We preserve existing labels and add the new one.
                const updatedLabels = [...currentLabels, { name: label }];

                await api.members.edit({
                    id: member.id,
                    labels: updatedLabels
                });
                console.log(`Updated existing member ${email} with label ${label}`);
                return res.json({ message: 'Member updated', isNew: false });
            } else {
                console.log(`Member ${email} already has label ${label}`);
                return res.json({ message: 'Member already has label', isNew: false });
            }

        } else {
            // Member does not exist - Create them
            await api.members.add({
                email: email,
                labels: [{ name: label }]
            });
            console.log(`Created new member ${email} with label ${label}`);
            return res.json({ message: 'Member created', isNew: true });
        }

    } catch (error) {
        console.error('Error processing request:', error);
        // Better error handling for API errors
        const errorMessage = error.context || error.message || 'Internal Server Error';
        res.status(500).json({ error: errorMessage });
    }
});

app.listen(port, () => {
    console.log(`Ghost Labeler Service running at http://localhost:${port}`);
});
