// Lobby UI Helper Functions

// Handle room type change in create room modal
document.addEventListener('DOMContentLoaded', () => {
    const roomTypeRadios = document.querySelectorAll('input[name="roomType"]');
    roomTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const sessionOptions = document.getElementById('sessionOptions');
            if (e.target.value === 'session') {
                sessionOptions.style.display = 'block';
            } else {
                sessionOptions.style.display = 'none';
            }
        });
    });
    
    // Handle remove method change for 3-player games
    const removeMethodRadios = document.querySelectorAll('input[name="removeMethod"]');
    removeMethodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const cardSelect = document.getElementById('cardToRemove');
            if (e.target.value === 'choose') {
                cardSelect.classList.remove('hidden');
            } else {
                cardSelect.classList.add('hidden');
            }
        });
    });
});

