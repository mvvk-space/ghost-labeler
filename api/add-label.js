const GhostAdminAPI = require('@tryghost/admin-api');

// Initialize the API Client outside the handler for potential reuse/caching
let api;

if (process.env.GHOST_URL && process.env.GHOST_ADMIN_KEY) {
    try {
        api = new GhostAdminAPI({
            url: process.env.GHOST_URL,
            key: process.env.GHOST_ADMIN_KEY,
            version: "v5.0"
        });
        console.log("Ghost Admin API initialized.");
    } catch (err) {
        console.error("Failed to initialize Ghost API:", err);
    }
}

module.exports = async (req, res) => {
    // Enable CORS for your Ghost blog domain
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // REPLACE '*' WITH YOUR BLOG URL IN PRODUCTION FOR SECURITY
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!api) {
        console.error("Ghost API not initialized due to missing credentials.");
        return res.status(500).json({ error: 'Server misconfiguration: Credentials missing' });
    }

    // 1. Get data from the form request
    const { email, label } = req.body;

    if (!email || !label) {
        return res.status(400).json({ error: 'Email and Label are required' });
    }

    try {
        let memberToUpdate;
        let existingLabels = []; // Array of objects {name: 'string', slug: 'string'}

        // 2. Check if member exists
        console.log(`Checking existence for email: ${email}`);
        const members = await api.members.browse({ filter: `email:'${email}'` });

        if (members && members.length > 0) {
            // MEMBER EXISTS: Get their ID and current labels
            memberToUpdate = members[0];
            existingLabels = memberToUpdate.labels || [];
            console.log(`Member found: ${memberToUpdate.id}. Current labels: ${existingLabels.map(l => l.name).join(', ')}`);

            // Prevent duplicate labels
            const labelExists = existingLabels.some(l => l.name === label);
            if (labelExists) {
                console.log(`Member already has label: ${label}`);
                return res.status(200).json({ success: true, message: 'Member already has this label.' });
            }

        } else {
            // MEMBER DOES NOT EXIST: Create them
            console.log("Member not found. Creating new member...");
            try {
                const newMember = await api.members.add({ email: email });
                memberToUpdate = newMember;
                existingLabels = [];
                console.log(`New member created: ${memberToUpdate.id}`);
            } catch (createError) {
                console.error("Error creating member:", createError);
                // If creation fails (e.g., race condition), try to find them again or error out
                return res.status(500).json({ error: 'Failed to create new member' });
            }
        }

        // 3. Merge Labels (Old + New)
        // We only need to send the 'name', Ghost handles the slug
        // existingLabels is an array of objects, we need to preserve that structure
        const payloadLabels = existingLabels.map(l => ({ name: l.name }));
        payloadLabels.push({ name: label });

        // 4. Update the Member
        console.log(`Updating member ${memberToUpdate.id} with labels: ${payloadLabels.map(l => l.name).join(', ')}`);
        await api.members.edit({
            id: memberToUpdate.id,
            labels: payloadLabels
        });

        return res.status(200).json({ success: true, message: 'Label applied successfully' });

    } catch (error) {
        console.error("Critical Error in execution:", error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
