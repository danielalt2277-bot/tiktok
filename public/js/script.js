document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connect-button');
    const usernameInput = document.getElementById('username-input');
    const statusDiv = document.getElementById('status');
    const likersList = document.getElementById('likers-list');

    const socket = io();

    connectButton.addEventListener('click', () => {
        const username = usernameInput.value;
        if (username) {
            statusDiv.textContent = `Connecting to ${username}...`;
            socket.emit('setUniqueId', username);
        }
    });

    socket.on('connected', (message) => {
        statusDiv.textContent = message;
    });

    socket.on('connectionFailed', (message) => {
        statusDiv.textContent = message;
    });

    socket.on('topLikersUpdate', (topLikers) => {
        likersList.innerHTML = '';
        topLikers.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="${user.pfp}" alt="${user.username}">
                <div class="user-info">
                    <div class="username">${user.username}</div>
                    <div class="likes">${user.likes} likes</div>
                </div>
            `;
            likersList.appendChild(li);
        });
    });
});
