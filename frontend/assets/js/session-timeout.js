/**
 * Session Timeout Handler
 * Logs out users after 30 minutes of inactivity
 * Shows a prompt 2 minutes before timeout asking if they want to stay logged in
 */

(function() {
    'use strict';

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout
    const CHECK_INTERVAL = 60 * 1000; // Check every minute

    let inactivityTimer = null;
    let warningTimer = null;
    let lastActivityTime = Date.now();
    let warningModal = null;
    let isWarningShown = false;

    // Activity events to track
    const activityEvents = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click',
        'keydown'
    ];

    /**
     * Reset the inactivity timer
     */
    function resetTimer() {
        lastActivityTime = Date.now();
        isWarningShown = false;

        // Clear existing timers
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
        if (warningTimer) {
            clearTimeout(warningTimer);
        }

        // Hide warning modal if shown
        hideWarningModal();

        // Set warning timer (28 minutes = 30 minutes - 2 minutes warning)
        warningTimer = setTimeout(() => {
            showWarningModal();
        }, INACTIVITY_TIMEOUT - WARNING_TIME);

        // Set logout timer (30 minutes)
        inactivityTimer = setTimeout(() => {
            logoutUser();
        }, INACTIVITY_TIMEOUT);
    }

    /**
     * Show warning modal asking if user wants to stay logged in
     */
    function showWarningModal() {
        if (isWarningShown) return;
        isWarningShown = true;

        // Create modal HTML
        const modalHTML = `
            <div id="session-timeout-modal" class="session-timeout-modal">
                <div class="session-timeout-overlay"></div>
                <div class="session-timeout-content">
                    <div class="session-timeout-header">
                        <h3>Session Timeout Warning</h3>
                    </div>
                    <div class="session-timeout-body">
                        <p>You have been inactive for 28 minutes. Your session will expire in 2 minutes.</p>
                        <p>Do you want to stay logged in?</p>
                    </div>
                    <div class="session-timeout-actions">
                        <smart-button class="primary" id="session-stay-btn">Stay Logged In</smart-button>
                        <smart-button class="secondary" id="session-logout-btn">Logout</smart-button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        warningModal = document.getElementById('session-timeout-modal');

        // Wait for Smart UI to upgrade buttons
        setTimeout(() => {
            const stayBtn = document.getElementById('session-stay-btn');
            const logoutBtn = document.getElementById('session-logout-btn');

            if (stayBtn) {
                stayBtn.addEventListener('click', () => {
                    resetTimer();
                    hideWarningModal();
                });
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    logoutUser();
                });
            }
        }, 100);

        // Auto-logout if user doesn't respond within 2 minutes
        setTimeout(() => {
            if (isWarningShown) {
                logoutUser();
            }
        }, WARNING_TIME);
    }

    /**
     * Hide warning modal
     */
    function hideWarningModal() {
        if (warningModal) {
            warningModal.remove();
            warningModal = null;
        }
        isWarningShown = false;
    }

    /**
     * Logout user and redirect to login page
     */
    async function logoutUser() {
        try {
            // Call logout endpoint to destroy session
            await fetch('./backend/session-timeout.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error during session timeout logout:', error);
        } finally {
            // Redirect to login page
            window.location.href = './index.php';
        }
    }

    /**
     * Track user activity
     */
    function trackActivity() {
        resetTimer();
    }

    /**
     * Initialize session timeout tracking
     */
    function init() {
        // Only run on authenticated pages (not login/register pages)
        if (window.location.pathname.includes('index.php') || 
            window.location.pathname.includes('register.php') ||
            window.location.pathname.includes('forgot-password.php') ||
            window.location.pathname.includes('reset-password.php')) {
            return;
        }

        // Attach activity listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, trackActivity, true);
        });

        // Start the timer
        resetTimer();

        // Also check periodically (every minute) to handle edge cases
        setInterval(() => {
            const timeSinceActivity = Date.now() - lastActivityTime;
            if (timeSinceActivity >= INACTIVITY_TIMEOUT && !isWarningShown) {
                logoutUser();
            }
        }, CHECK_INTERVAL);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

