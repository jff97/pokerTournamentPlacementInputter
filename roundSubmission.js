/**
 * Round Submission Manager
 * Handles displaying the round complete screen and submitting results to the backend
 */
class RoundSubmissionManager {
    // Configuration
    static CONFIG = {
        API_URL: 'https://api.johnfoxweb.com/api/automatic-points/add-round',
        API_ROOT_URL: 'https://api.johnfoxweb.com/',
        BARS_URL: 'https://jff97.github.io/PokerAnalyzerDisplayWebsite/static/cachedLeaderboards/automatic-points-bars.json',
        PASSWORD_STORAGE_KEY: 'lastSubmitPassword',
        BARS_TIMEOUT_MS: 15000,
        SUBMISSION_TIMEOUT_MS: 45000,
        WARMUP_TIMEOUT_MS: 15000
    };

    static DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // DOM element IDs
    static DOM = {
        TOURNAMENT_SECTION: 'tournamentSection',
        ROUND_COMPLETE_SECTION: 'roundCompleteSection',
        CHECK_IN_SECTION: 'checkInSection',
        BAR_CONTAINER: 'barSelectionContainer',
        BAR_ERROR: 'barLoadError'
    };

    constructor() {
        this.hasAutoShown = false;
        this.warmupIntervalId = null;
        this.warmupCount = 0;
        this.maxWarmups = 15; // Limit to 15 warmups (30 minutes at 2-min intervals)
    }

    async showRoundCompleteScreen(isAutomatic = false) {
        // Prevent multiple automatic shows
        if (isAutomatic && this.hasAutoShown) {
            return;
        }
        if (isAutomatic) {
            this.hasAutoShown = true;
        }

        // Download results and switch screens
        scorer.exportResults();
        this.showScreen(RoundSubmissionManager.DOM.ROUND_COMPLETE_SECTION);

        // Start warmup interval
        this.startWarmupInterval();

        // Load and render bars
        await this.loadBars();
    }

    async loadBars() {
        const container = document.getElementById(RoundSubmissionManager.DOM.BAR_CONTAINER);
        const errorDiv = document.getElementById(RoundSubmissionManager.DOM.BAR_ERROR);

        container.innerHTML = '<div style="text-align: center; color: #999;">Loading bars...</div>';
        errorDiv.style.display = 'none';

        try {
            const bars = await this.fetchBars();
            this.renderBarOptions(bars, container);
        } catch (error) {
            console.error('Error loading bars:', error);
            errorDiv.textContent = `Error loading bars: ${error.message}`;
            errorDiv.style.display = 'block';
            container.innerHTML = '';
        }
    }

    async fetchBars() {
        const response = await this.fetchWithTimeout(
            RoundSubmissionManager.CONFIG.BARS_URL,
            {},
            RoundSubmissionManager.CONFIG.BARS_TIMEOUT_MS
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch bars: ${response.status}`);
        }

        const data = await response.json();
        const bars = Array.isArray(data) ? data : (data.bars || []);
        
        if (!Array.isArray(bars)) {
            throw new Error('Invalid bars data format');
        }

        return bars;
    }

    renderBarOptions(bars, container) {
        container.innerHTML = '';

        if (bars.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999;">No bars available</div>';
            return;
        }

        const sortedBars = this.sortBarsByDay(bars);
        const today = RoundSubmissionManager.DAY_ORDER[new Date().getDay()];

        const barGrid = document.createElement('div');
        barGrid.className = 'bar-grid';

        let dividerInserted = false;
        sortedBars.forEach(bar => {
            const isToday = bar.day === today;

            // Separate today's bars from the rest once we reach the first non-today bar
            if (!isToday && !dividerInserted && barGrid.children.length > 0) {
                const divider = document.createElement('div');
                divider.className = 'bar-grid-divider';
                barGrid.appendChild(divider);
                dividerInserted = true;
            }

            const barButton = document.createElement('button');
            barButton.className = 'btn btn-primary bar-button' + (isToday ? ' bar-button-today' : '');
            barButton.textContent = bar.bar_title || 'Unknown Bar';
            barButton.addEventListener('click', () => this.selectBar(bar.bar_id, bar.bar_title || 'Unknown Bar', barButton));

            barGrid.appendChild(barButton);
        });

        container.appendChild(barGrid);
    }

    sortBarsByDay(bars) {
        const todayIndex = new Date().getDay();

        const daysUntil = (bar) => {
            const dayIndex = RoundSubmissionManager.DAY_ORDER.indexOf(bar.day);
            if (dayIndex === -1) return RoundSubmissionManager.DAY_ORDER.length; // unrecognized day goes last
            return (dayIndex - todayIndex + 7) % 7;
        };

        return [...bars].sort((a, b) => daysUntil(a) - daysUntil(b));
    }

    selectBar(barId, barName, button) {
        this.showPasswordModal(barId, barName, button);
    }

    showPasswordModal(barId, barName, button) {
        let modal = document.getElementById('passwordModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'passwordModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3 id="passwordModalTitle">Enter Admin Password</h3>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="passwordModalInput">Password:</label>
                            <input type="text" id="passwordModalInput" placeholder="Enter admin password" />
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="passwordModalSubmitBtn" class="btn btn-primary">Submit</button>
                        <button id="passwordModalCancelBtn" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const input = document.getElementById('passwordModalInput');
            // Persist on every change so it's remembered even if the user cancels
            input.addEventListener('input', () => {
                localStorage.setItem(RoundSubmissionManager.CONFIG.PASSWORD_STORAGE_KEY, input.value);
            });
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.confirmPasswordModal();
            });

            document.getElementById('passwordModalSubmitBtn').addEventListener('click', () => this.confirmPasswordModal());
            document.getElementById('passwordModalCancelBtn').addEventListener('click', () => this.closePasswordModal());
        }

        this.pendingBarId = barId;
        this.pendingBarName = barName;
        this.pendingButton = button;

        const input = document.getElementById('passwordModalInput');
        document.getElementById('passwordModalTitle').textContent = `Enter admin password to submit to ${barName}:`;
        input.value = localStorage.getItem(RoundSubmissionManager.CONFIG.PASSWORD_STORAGE_KEY) || '';

        modal.classList.add('active');
        input.focus();
    }

    confirmPasswordModal() {
        const input = document.getElementById('passwordModalInput');
        const password = input.value;
        if (!password) {
            return;
        }

        const { pendingBarId, pendingBarName, pendingButton } = this;
        this.closePasswordModal();

        pendingButton.disabled = true;
        pendingButton.textContent = 'Submitting...';

        this.submitRoundResults(pendingBarId, pendingBarName, password, pendingButton);
    }

    closePasswordModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async submitRoundResults(barId, barName, password, button) {
        try {
            const playerScores = this.buildPlayerScores();
            
            if (playerScores.length === 0) {
                showMessageModal('No Data', 'No players to submit');
                this.resetButton(button, barName);
                return;
            }

            button.textContent = 'Waking up server...';
            await this.warmupServer(true);

            button.textContent = 'Submitting...';
            const response = await this.fetchWithTimeout(RoundSubmissionManager.CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, bar_id: barId, player_scores: playerScores })
            }, RoundSubmissionManager.CONFIG.SUBMISSION_TIMEOUT_MS);

            const responseResult = await this.parseResponse(response);
            this.handleSubmissionResponse(response, responseResult, barName, button);
        } catch (error) {
            console.error('Submission error:', error);
            showMessageModal('Submission Error', this.getSubmissionErrorMessage(error));
            this.resetButton(button, barName);
        }
    }

    async fetchWithTimeout(url, options = {}, timeoutMs = RoundSubmissionManager.CONFIG.SUBMISSION_TIMEOUT_MS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    buildPlayerScores() {
        return scorer.players
            .filter(p => p.eliminated)
            .sort((a, b) => a.eliminationOrder - b.eliminationOrder)
            .map(p => ({
                name: p.name,
                score: p.eliminationPoints + p.bonusPoints
            }));
    }

    async parseResponse(response) {
        try {
            return {
                data: await response.json(),
                parseError: null
            };
        } catch (error) {
            return {
                data: null,
                parseError: error
            };
        }
    }

    handleSubmissionResponse(response, responseResult, barName, button) {
        if (!response.ok) {
            this.handleSubmissionError(response.status, responseResult.data || {}, button, barName);
            return;
        }

        if (responseResult.parseError || !responseResult.data || typeof responseResult.data.round_id === 'undefined') {
            showMessageModal(
                'Submission Status Unclear',
                '⚠️ The server responded, but not in the expected format. The round may still have been submitted, so please verify before trying again.'
            );
            this.resetButton(button, barName);
            return;
        }

        this.stopWarmupInterval();
        showMessageModal('Success', `✅ Round successfully submitted to ${barName}!\nRound ID: ${responseResult.data.round_id}`);
        this.showScreen(RoundSubmissionManager.DOM.CHECK_IN_SECTION);
        this.hasAutoShown = false;
    }

    handleSubmissionError(status, data, button, barName) {
        const messages = {
            401: '❌ Invalid password',
            400: `❌ Bad request: ${data.error || 'Unknown error'}`,
            503: '❌ The submission server is temporarily unavailable. It may still be waking up, so wait a moment before trying again.',
        };
        showMessageModal('Submission Error', messages[status] || `❌ Server error: ${status}`);
        this.resetButton(button, barName);
    }

    getSubmissionErrorMessage(error) {
        if (error.name === 'AbortError') {
            return '❌ The submission server took too long to respond. The Azure free-tier server may still be waking up, and the round may still have been received. Please wait a moment and verify whether the round was created before retrying.';
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return '❌ Your device appears to be offline, so the round could not be submitted.';
        }

        return '❌ Could not reach the submission server. This usually means a network-level problem such as the Azure server being asleep, DNS not resolving, CORS blocking the response, or a browser/network tool interrupting the request. If you already clicked submit, the round may still have been processed, so verify before trying again.';
    }

    resetButton(button, barName) {
        button.disabled = false;
        button.textContent = barName;
    }

    backFromRoundComplete() {
        this.stopWarmupInterval();
        this.showScreen(RoundSubmissionManager.DOM.TOURNAMENT_SECTION);
        this.hasAutoShown = false;
    }

    // Simple hook to warm up Azure server when top 3 finalists are eliminated
    async warmupServer(waitForCompletion = false) {
        try {
            this.warmupCount++;
            const warmupRequest = this.fetchWithTimeout(RoundSubmissionManager.CONFIG.API_ROOT_URL, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-store'
            }, RoundSubmissionManager.CONFIG.WARMUP_TIMEOUT_MS);

            if (waitForCompletion) {
                await warmupRequest;
            }
            
            // Stop after reaching max warmups
            if (this.warmupCount >= this.maxWarmups) {
                this.stopWarmupInterval();
            }
        } catch (e) {
            // Silently ignore - this is just a warmup call
        }
    }

    startWarmupInterval() {
        // Start interval to warm up server every 2 minutes (all browsers support setInterval)
        if (this.warmupIntervalId === null) {
            this.warmupCount = 0;
            this.warmupServer(); // Immediate call
            this.warmupIntervalId = setInterval(() => this.warmupServer(), 120000); // 2 minutes = 120000ms
        }
    }

    stopWarmupInterval() {
        if (this.warmupIntervalId !== null) {
            clearInterval(this.warmupIntervalId);
            this.warmupIntervalId = null;
        }
    }

    showScreen(screenId) {
        // Hide all screens
        document.getElementById(RoundSubmissionManager.DOM.TOURNAMENT_SECTION).style.display = 'none';
        document.getElementById(RoundSubmissionManager.DOM.ROUND_COMPLETE_SECTION).style.display = 'none';
        document.getElementById(RoundSubmissionManager.DOM.CHECK_IN_SECTION).style.display = 'none';
        // Show the requested screen
        document.getElementById(screenId).style.display = 'block';
    }
}

// Initialize the Round Submission Manager
const roundSubmissionManager = new RoundSubmissionManager();
