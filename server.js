const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { TikTokLiveConnection } = require('tiktok-live-connector');
const fs = require('fs');

// Serve static files from the 'public' directory
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected.');

    let tiktokLiveConnection;

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
            }
        });

        tiktokLiveConnection.connect().then(state => {
            console.info(`Connected to roomId ${state.roomId}`);
            socket.emit('connected', `Connected to ${uniqueId}`);

            // NOW setup event handlers
            setupEventHandlers(tiktokLiveConnection);

        }).catch(err => {
            console.error(`Connection failed on attempt ${attempt}:`, String(err));
            setTimeout(() => connectWithRetry(uniqueId, attempt + 1), 3000); // Wait 3 seconds
        });
    };

    const setupEventHandlers = (connection) => {
        let donators = {};

        connection.on('gift', (data) => {
            const logMessage = `${new Date().toISOString()} - ${data.uniqueId} sent ${data.giftName} x${data.repeatCount}\n`;
            fs.appendFile('donations.log', logMessage, (err) => {
                if (err) console.error(err);
            });
            // Process gift event to track top donators
            if (data.uniqueId && data.diamondCount > 0) {
                if (!donators[data.uniqueId]) {
                    donators[data.uniqueId] = {
                        username: data.uniqueId,
                        coins: 0,
                        pfp: data.profilePictureUrl,
                    };
                }

                donators[data.uniqueId].coins += data.diamondCount * data.repeatCount;

                const topDonators = Object.values(donators)
                    .sort((a, b) => b.coins - a.coins)
                    .slice(0, 3);

                socket.emit('topDonatorsUpdate', topDonators);
            }
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
