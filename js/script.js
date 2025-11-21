
document.addEventListener('DOMContentLoaded', () => {
    const likeButton = document.getElementById('like-button');
    const likersList = document.getElementById('likers-list');

    let users = [
        { id: 1, username: 'user1', pfp: 'https://i.pravatar.cc/50?u=user1', likes: 10 },
        { id: 2, username: 'user2', pfp: 'https://i.pravatar.cc/50?u=user2', likes: 20 },
        { id: 3, username: 'user3', pfp: 'https://i.pravatar.cc/50?u=user3', likes: 15 },
        { id: 4, username: 'user4', pfp: 'https://i.pravatar.cc/50?u=user4', likes: 5 },
        { id: 5, username: 'user5', pfp: 'https://i.pravatar.cc/50?u=user5', likes: 25 },
        { id: 6, username: 'user6', pfp: 'https://i.pravatar.cc/50?u=user6', likes: 30 },
    ];

    function displayTopLikers() {
        likersList.innerHTML = '';
        const sortedUsers = [...users].sort((a, b) => b.likes - a.likes);
        const top5 = sortedUsers.slice(0, 5);

        top5.forEach(user => {
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
    }

    likeButton.addEventListener('click', () => {
        const randomUserId = Math.floor(Math.random() * 6) + 1;
        const user = users.find(u => u.id === randomUserId);
        if (user) {
            user.likes++;
            displayTopLikers();
        }
    });

    displayTopLikers();
});
