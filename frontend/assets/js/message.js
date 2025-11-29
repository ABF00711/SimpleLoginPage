/**
 * Message Banner
 * Fetches and displays message from message table
 */

(function() {
    'use strict';

    async function loadMessage() {
        try {
            const response = await fetch('./backend/message.php');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message || 'Failed to load message');
            }

            const messageBanner = document.getElementById('message-banner');
            const messageText = messageBanner?.querySelector('.message-text');
            const messageClose = messageBanner?.querySelector('.message-close');

            if (!messageBanner || !messageText) {
                return;
            }

            // If message exists, display it
            if (result.data && result.data.description) {
                messageText.textContent = result.data.description;
                messageBanner.style.display = 'block';
            } else {
                // No message, hide banner
                messageBanner.style.display = 'none';
            }

            // Handle close button
            if (messageClose) {
                messageClose.addEventListener('click', () => {
                    messageBanner.style.display = 'none';
                    // Optionally save to localStorage to remember user dismissed it
                    if (result.data && result.data.id) {
                        localStorage.setItem(`message_dismissed_${result.data.id}`, 'true');
                    }
                });
            }

        } catch (error) {
            console.error('Error loading message:', error);
            // Hide banner on error
            const messageBanner = document.getElementById('message-banner');
            if (messageBanner) {
                messageBanner.style.display = 'none';
            }
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadMessage);
    } else {
        loadMessage();
    }
})();

