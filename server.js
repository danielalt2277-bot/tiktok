const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { TikTokLiveConnection } = require('tiktok-live-connector');
const fs = require('fs');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Log file for donations
const DONATIONS_LOG_FILE = 'donations.log';

io.on('connection', (socket) => {
    console.log('A user connected.');

    let tiktokLiveConnection;
    let donators = {}; // Moved donators here to be unique per connection

    const connectWithRetry = (uniqueId, attempt = 1) => {
        if (attempt > 3) {
            socket.emit('connectionFailed', 'Connection failed after 3 attempts. Please try again later.');
            return;
        }

        console.log(`Connecting to TikTok LIVE of ${uniqueId} (Attempt ${attempt})`);
        socket.emit('statusUpdate', `Connecting... (Attempt ${attempt}/3)`);

        tiktokLiveConnection = new TikTokLiveConnection(uniqueId, {
            clientParams: {
                "app_language": "en-US",
                "device_platform": "web"
            },
            requestHeaders: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36"
            },
            enableExtendedGiftInfo: true // Enable this to get gift details
        });

        tiktokLiveConnection.connect().then(state => {
            console.info(`Connected to roomId ${state.roomId}`);
            socket.emit('connected', `Connected to ${uniqueId}`);
            setupEventHandlers(tiktokLiveConnection);
        }).catch(err => {
            console.error(`Connection failed on attempt ${attempt}:`, String(err));
            setTimeout(() => connectWithRetry(uniqueId, attempt + 1), 3000); // Wait 3 seconds
        });
    };

    const setupEventHandlers = (connection) => {
        connection.on('gift', (data) => {
            // Process gift only when streak is over
            if (data.giftType === 1 && !data.repeatEnd) {
                return;
            }

            // User data might be missing
            if (!data.user || !data.user.uniqueId) {
                return;
            }

            const userId = data.user.uniqueId;

            // Diamond count can be inconsistent
            const diamondCount = data.diamondCount || data.gift?.diamond_count || 0;
            const repeatCount = data.repeatCount || 1;
            const totalDiamonds = diamondCount * repeatCount;

            // Profile picture URL can be inconsistent
            const pfp = data.user.profilePictureUrl || data.profilePictureUrl || 'https://placehold.co/100x100.png';

            if (!donators[userId]) {
                donators[userId] = {
                    username: userId,
                    diamonds: 0,
                    pfp: pfp
                };
            }

            donators[userId].diamonds += totalDiamonds;

            // Log the donation
            const giftName = data.giftName || data.gift?.name || 'Unknown Gift';
            const logEntry = `${new Date().toISOString()} | ${userId} donated ${totalDiamonds} diamonds with ${giftName}.\n`;
            fs.appendFile(DONATIONS_LOG_FILE, logEntry, (err) => {
                if (err) console.error('Failed to log donation:', err);
            });

            // Update and emit top 5 donators
            const top5Donators = Object.values(donators)
                .sort((a, b) => b.diamonds - a.diamonds)
                .slice(0, 5);
            socket.emit('topDonatorsUpdate', top5Donators);
        });

        connection.on('disconnect', () => {
            console.log('Disconnected from TikTok LIVE');
        });

        connection.on('error', (err) => {
            console.error('Connection error:', String(err));
        });
    };

    socket.on('setUniqueId', (uniqueId) => {
        if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
        }
        donators = {}; // Reset donators for the new connection
        // Emit an empty list to clear the frontend
        socket.emit('topDonatorsUpdate', []);
        connectWithRetry(uniqueId);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected.');
        if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
