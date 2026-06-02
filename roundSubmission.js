/**
 * Round Submission Manager
 * Handles displaying the round complete screen and submitting results to the backend
 */
class RoundSubmissionManager {
    // Configuration
    static CONFIG = {
        API_URL: 'https://api.johnfoxweb.com/api/automatic-points/add-round',
        BARS_URL: 'https://jff97.github.io/PokerAnalyzerDisplayWebsite/static/cachedLeaderboards/automatic-points-bars.json'
    };

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
        const response = await fetch(RoundSubmissionManager.CONFIG.BARS_URL);
        
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

        const barGrid = document.createElement('div');
        barGrid.className = 'bar-grid';

        bars.forEach(bar => {
            const barButton = document.createElement('button');
            barButton.className = 'btn btn-primary bar-button';
            barButton.textContent = bar.bar_title || 'Unknown Bar';
            barButton.addEventListener('click', () => this.selectBar(bar.bar_id, bar.bar_title || 'Unknown Bar', barButton));

            barGrid.appendChild(barButton);
        });

        container.appendChild(barGrid);
    }

    selectBar(barId, barName, button) {
        // Prompt for password
        const password = prompt(`Enter admin password to submit to ${barName}:`);
        if (!password) {
            return;
        }

        button.disabled = true;
        button.textContent = 'Submitting...';

        this.submitRoundResults(barId, barName, password, button);
    }

    async submitRoundResults(barId, barName, password, button) {
        try {
            const playerScores = this.buildPlayerScores();
            
            if (playerScores.length === 0) {
                showMessageModal('No Data', 'No players to submit');
                this.resetButton(button, barName);
                return;
            }

            const response = await fetch(RoundSubmissionManager.CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, bar_id: barId, player_scores: playerScores })
            });

            const data = await this.parseResponse(response);
            this.handleSubmissionResponse(response, data, barName, button);
        } catch (error) {
            console.error('Submission error:', error);
            showMessageModal('Submission Error', `❌ Error: ${error.message}`);
            this.resetButton(button, barName);
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
            return await response.json();
        } catch (e) {
            return { error: 'Invalid server response' };
        }
    }

    handleSubmissionResponse(response, data, barName, button) {
        if (!response.ok) {
            this.handleSubmissionError(response.status, data, button, barName);
            return;
        }

        showMessageModal('Success', `✅ Round successfully submitted to ${barName}!\nRound ID: ${data.round_id}`);
        scorer.clearAll();
        this.showScreen(RoundSubmissionManager.DOM.CHECK_IN_SECTION);
        this.hasAutoShown = false;
    }

    handleSubmissionError(status, data, button, barName) {
        const messages = {
            401: '❌ Invalid password',
            400: `❌ Bad request: ${data.error || 'Unknown error'}`,
        };
        showMessageModal('Submission Error', messages[status] || `❌ Server error: ${status}`);
        this.resetButton(button, barName);
    }

    resetButton(button, barName) {
        button.disabled = false;
        button.textContent = barName;
    }

    backFromRoundComplete() {
        this.showScreen(RoundSubmissionManager.DOM.TOURNAMENT_SECTION);
        this.hasAutoShown = false;
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
