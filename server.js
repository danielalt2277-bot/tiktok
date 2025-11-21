const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files from the 'public' directory
app.use(express.static('public'));

const { TikTokLiveConnection } = require('tiktok-live-connector');

io.on('connection', (socket) => {
  console.log('A user connected.');

  // Scoped variable for each client connection
  let tiktokLiveConnection;

  socket.on('setUniqueId', (uniqueId) => {
    if (tiktokLiveConnection) {
      tiktokLiveConnection.disconnect();
    }

    console.log(`Connecting to TikTok LIVE of ${uniqueId}`);

    // Create a new wrapper object and pass the username
    tiktokLiveConnection = new TikTokLiveConnection(uniqueId);

    // Connect to the webcast
    tiktokLiveConnection.connect().then(state => {
      console.info(`Connected to roomId ${state.roomId}`);
      socket.emit('connected', `Connected to ${uniqueId}`);
    }).catch(err => {
      // Final attempt at robust error parsing
      let errorString = 'Unknown Error';
      if (typeof err === 'object' && err !== null) {
        if (err.hasOwnProperty('message')) {
          errorString = String(err.message);
        } else {
          errorString = JSON.stringify(err);
        }
      } else {
        errorString = String(err);
      }

      console.error('Failed to connect', errorString);

      // The unofficial library is unstable. Provide a clear message to the user.
      let errorMessage = 'Connection failed. The service used to connect to TikTok is currently unstable. Please try again later.';
      socket.emit('connectionFailed', errorMessage);
    });

    let likers = {};

    // Define the events to listen for
    tiktokLiveConnection.on('like', data => {
      if (data.uniqueId) {
        if (!likers[data.uniqueId]) {
          likers[data.uniqueId] = {
            username: data.uniqueId,
            likes: 0,
            pfp: data.profilePictureUrl
          };
        }
        likers[data.uniqueId].likes += data.likeCount;

        // Sort and get top 5
        const sortedLikers = Object.values(likers).sort((a, b) => b.likes - a.likes);
        const top5 = sortedLikers.slice(0, 5);

        socket.emit('topLikersUpdate', top5);
      }
    });

    tiktokLiveConnection.on('gift', (data) => {
        // This is a good place to add gift tracking if desired in the future
      console.log(`${data.uniqueId} sends a gift!`);
    });

    tiktokLiveConnection.on('disconnect', () => {
        console.log('Disconnected from TikTok LIVE');
    });

    tiktokLiveConnection.on('error', (err) => {
        console.error('Connection error:', String(err));
        // Do not send another message here, as the initial 'catch' will handle it.
    });
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
