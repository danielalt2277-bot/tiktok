document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connect-button');
    const usernameInput = document.getElementById('username-input');
    const statusDiv = document.getElementById('status');
    const leaderboardList = document.getElementById('leaderboard-list');
    const loader = document.getElementById('loader');

    const socket = io();

    connectButton.addEventListener('click', () => {
        const username = usernameInput.value;
        if (username) {
            leaderboardList.innerHTML = ''; // Clear the list on new connection
            loader.classList.remove('hidden');
            socket.emit('setUniqueId', username);
        }
    });

    socket.on('statusUpdate', (message) => {
        statusDiv.textContent = message;
    });

    socket.on('connected', (message) => {
        statusDiv.textContent = message;
        loader.classList.add('hidden');
    });

    socket.on('connectionFailed', (message) => {
        statusDiv.textContent = message;
        loader.classList.add('hidden');
    });

    socket.on('topDonatorsUpdate', (topDonators) => {
        leaderboardList.innerHTML = '';
        topDonators.forEach((user, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="rank">${index + 1}</div>
                <img src="${user.pfp}" alt="${user.username}" class="pfp">
                <div class="user-info">
                    <div class="username">${user.username}</div>
                    <div class="coins">
                        <span class="coin-icon"></span>
                        ${user.coins}
                    </div>
                </div>
            `;
            leaderboardList.appendChild(li);
        });
    });
});
