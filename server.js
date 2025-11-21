const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { TikTokLiveConnection } = require('tiktok-live-connector');

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
        let likers = {};
        connection.on('like', data => {
            if (data.uniqueId) {
                if (!likers[data.uniqueId]) {
                    likers[data.uniqueId] = {
                        username: data.uniqueId,
                        likes: 0,
                        pfp: data.profilePictureUrl
                    };
                }
                likers[data.uniqueId].likes += data.likeCount;
                const top5 = Object.values(likers).sort((a, b) => b.likes - a.likes).slice(0, 5);
                socket.emit('topLikersUpdate', top5);
            }
        });

        connection.on('gift', (data) => {
            socket.emit('gift', data);
        })

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
