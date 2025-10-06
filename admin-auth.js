// Admin Authentication Handler
// This script checks if user is logged in before accessing admin panel

(async function checkAuth() {
    // Wait for Supabase to load
    if (!window.supabaseClient) {
        console.error('Supabase not loaded!');
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        // Check if user is logged in
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Auth error:', error);
            window.location.href = 'admin-login.html';
            return;
        }

        if (!session) {
            // Not logged in, redirect to login page
            console.log('No active session, redirecting to login...');
            window.location.href = 'admin-login.html';
            return;
        }

        // User is logged in
        console.log('✅ Authenticated as:', session.user.email);
        
        // Display user email in UI (optional)
        const userEmail = document.querySelector('.user-email');
        if (userEmail) {
            userEmail.textContent = session.user.email;
        }

        // Add logout functionality
        setupLogout();

    } catch (err) {
        console.error('Authentication check failed:', err);
        window.location.href = 'admin-login.html';
    }
})();

// Setup logout button
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const { error } = await window.supabaseClient.auth.signOut();
                if (error) throw error;
                
                window.location.href = 'admin-login.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to logout: ' + error.message);
            }
        });
    }
}

// Check auth state changes
window.supabaseClient?.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'admin-login.html';
    }
});

