/**
 * Global helper function to show message modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 */
function showMessageModal(title, message) {
    document.getElementById('messageModalTitle').textContent = title;
    document.getElementById('messageModalText').textContent = message;
    document.getElementById('messageModal').classList.add('active');
}

// Tournament Scorer Application
class TournamentScorer {
    constructor() {
        this.players = [];
        this.totalPlayers = 0;
        this.nextEliminationOrder = 1;
        this.editingPlayer = null;
        this.pendingPlayerName = null; // Track pending player for similar names modal
        this.pendingPlayerToRemove = null; // Track pending player for remove confirmation
        this.selectedMissingPlayer = null; // Track selected player for add missing player modal
        this.selectedMissingPlayerPosition = null; // Track selected position for add missing player
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.attachEventListeners();
        this.render();
    }

    // === Helper Methods ===
    
    getOrdinalPlace(number) {
        const j = number % 10;
        const k = number % 100;
        if (j === 1 && k !== 11) return number + 'st';
        if (j === 2 && k !== 12) return number + 'nd';
        if (j === 3 && k !== 13) return number + 'rd';
        return number + 'th';
    }
    
    getEliminatedPlayers() {
        return this.players.filter(p => p.eliminated);
    }

    getActivePlayers() {
        return this.players.filter(p => !p.eliminated);
    }

    updateNextEliminationOrder() {
        const eliminated = this.getEliminatedPlayers();
        if (eliminated.length === 0) {
            this.nextEliminationOrder = 1;
        } else {
            const maxOrder = Math.max(...eliminated.map(p => p.eliminationOrder));
            this.nextEliminationOrder = maxOrder + 1;
        }
    }

    shiftPlayersUp(fromPosition) {
        // Shifts all players at or after fromPosition up by 1
        this.players.forEach(player => {
            if (player.eliminated && player.eliminationOrder >= fromPosition) {
                player.eliminationOrder++;
                player.eliminationPoints = player.eliminationOrder;
                this.recalculateBonusPoints(player);
            }
        });
    }

    shiftPlayersDown(afterPosition) {
        // Shifts all players after afterPosition down by 1
        this.players.forEach(player => {
            if (player.eliminated && player.eliminationOrder > afterPosition) {
                player.eliminationOrder--;
                player.eliminationPoints = player.eliminationOrder;
                this.recalculateBonusPoints(player);
            }
        });
    }

    recalculateBonusPoints(player) {
        const playersRemaining = this.totalPlayers - player.eliminationOrder;
        if (playersRemaining === 0) {
            player.bonusPoints = 20; // 1st place
        } else if (playersRemaining === 1) {
            player.bonusPoints = 15; // 2nd place
        } else if (playersRemaining === 2) {
            player.bonusPoints = 10; // 3rd place
        } else {
            player.bonusPoints = 0;
        }
    }

    recalculateAllBonusPoints() {
        // Recalculate bonus points for all eliminated players
        this.players.forEach(player => {
            if (player.eliminated) {
                this.recalculateBonusPoints(player);
            }
        });
    }

    // === Event Listeners ===
    
    attachEventListeners() {
        // Check-in section
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.addPlayer());
        document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPlayer();
        });
        document.getElementById('startTournamentBtn').addEventListener('click', () => this.startTournament());
        document.getElementById('resumeTournamentBtn').addEventListener('click', () => this.resumeTournament());
        document.getElementById('backToCheckInBtn').addEventListener('click', () => this.backToCheckIn());
        document.getElementById('addMissingPlayerBtn').addEventListener('click', () => this.openAddMissingPlayerModal());
        
        // Clear all
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        
        // Export results
        document.getElementById('exportResultsBtn').addEventListener('click', () => this.exportResults());
        
        // Submit Round
        document.getElementById('submitRoundBtn').addEventListener('click', () => roundSubmissionManager.showRoundCompleteScreen());
        
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.closeEditModal());
        document.getElementById('removeScoreBtn').addEventListener('click', () => this.removeScore());
        
        // Eliminate Modal
        document.getElementById('confirmEliminateBtn').addEventListener('click', () => this.confirmEliminate());
        document.getElementById('cancelEliminateBtn').addEventListener('click', () => this.closeEliminateModal());
        document.getElementById('backToPlayerSelectBtn').addEventListener('click', () => this.backToPlayerSelection());
        document.getElementById('selectMissingPlayer').addEventListener('change', () => {
            // Auto-advance to position selection when a player is selected
            const playerName = document.getElementById('selectMissingPlayer').value;
            if (playerName) {
                this.showPositionSelection();
            } else {
                // Reset if empty option selected
                this.selectedMissingPlayer = null;
                this.selectedMissingPlayerPosition = null;
                document.getElementById('addPlayerStep1').style.display = 'block';
                document.getElementById('addPlayerStep2').style.display = 'none';
                document.getElementById('backToPlayerSelectBtn').style.display = 'none';
                document.getElementById('confirmEliminateBtn').style.display = 'none';
                document.getElementById('cancelEliminateBtn').style.display = 'inline-block';
            }
        });

        // Similar Names Modal
        document.getElementById('continueNewPlayerBtn').addEventListener('click', () => this.showNewPlayerConfirmation(this.pendingPlayerName));
        document.getElementById('cancelSimilarNamesBtn').addEventListener('click', () => this.closeSimilarNamesModal());

        // New Player Confirmation Modal
        document.getElementById('confirmNewPlayerBtn').addEventListener('click', () => this.confirmNewPlayerInput());
        document.getElementById('cancelNewPlayerBtn').addEventListener('click', () => this.closeNewPlayerModal());
        document.getElementById('newPlayerConfirmInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmNewPlayerInput();
        });

        // Remove Player Modal
        document.getElementById('confirmRemovePlayerBtn').addEventListener('click', () => this.confirmRemovePlayer());
        document.getElementById('cancelRemovePlayerBtn').addEventListener('click', () => this.closeRemovePlayerModal());

        // Message Modal
        document.getElementById('messageModalCloseBtn').addEventListener('click', () => this.closeMessageModal());

        // Round Complete Screen
        document.getElementById('backFromRoundCompleteBtn').addEventListener('click', () => roundSubmissionManager.backFromRoundComplete());
    }

    // === Helper: Show Message Modal ===

    showMessage(title, message) {
        document.getElementById('messageModalTitle').textContent = title;
        document.getElementById('messageModalText').textContent = message;
        document.getElementById('messageModal').classList.add('active');
    }

    closeMessageModal() {
        document.getElementById('messageModal').classList.remove('active');
    }

    // === Player Management ===

    async addPlayer() {
        const input = document.getElementById('playerNameInput');
        const name = input.value.trim();
        console.log('addPlayer called with name:', name);
        
        if (!name) {
            this.showMessage('Input Required', 'Please enter a player name');
            return;
        }

        // Run name validation
        const validationErrors = validateCheckInName(name);
        console.log('Validation errors:', validationErrors);
        if (validationErrors.length > 0) {
            // Check for similar names even when validation fails
            try {
                const similarNames = await getSimilarNames(name);
                
                if (similarNames.length > 0) {
                    // Show modal with validation error and similar name suggestions
                    this.showValidationErrorModal(name, validationErrors, similarNames);
                } else {
                    // No similar names, just show error with modal
                    this.showMessage('Invalid Name', validationErrors.join('\n'));
                }
            } catch (error) {
                this.showMessage('Invalid Name', validationErrors.join('\n'));
            }
            return;
        }

        if (this.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Duplicate Player', 'Player already exists');
            return;
        }

        // Check if name exists in system
        try {
            console.log('Checking if name exists in system:', name);
            const nameExists = await checkNameExists(name);
            console.log('Name exists in system:', nameExists);
            
            if (!nameExists) {
                // Check for similar names first
                const similarNames = await getSimilarNames(name);
                
                // If similar names exist, show the modal
                if (similarNames.length > 0) {
                    this.showSimilarNamesModal(name, similarNames);
                    return;
                }
                
                // If no similar names, check for players with same first name
                const firstNameMatches = await getPlayersByFirstName(name);
                
                if (firstNameMatches.length > 0) {
                    this.showSimilarNamesModal(name, firstNameMatches, 'firstNameMatch');
                    return;
                }
                
                // If no similar names or first name matches, go straight to new player confirmation
                this.showNewPlayerConfirmation(name);
                return;
            }
        } catch (error) {
            console.error('Error checking name:', error);
            this.showMessage('Connection Error', 'Unable to verify name in system. Please check your connection and try again.');
            return;
        }

        this.players.push({
            name: name,
            eliminationPoints: 0,
            bonusPoints: 0,
            eliminated: false,
            eliminationOrder: null,
            bonusActions: [false, false] // Track 2 bonus actions (2.5k each)
        });

        // If tournament is active, increment totalPlayers and recalculate bonus points
        if (this.totalPlayers > 0) {
            this.totalPlayers++;
            // Recalculate bonus points for all eliminated players with new totalPlayers count
            this.recalculateAllBonusPoints();
        }

        input.value = '';
        this.saveToStorage();
        this.render();
    }

    toggleBonusAction(name, actionIndex) {
        const player = this.players.find(p => p.name === name);
        if (!player) return;
        
        // Initialize bonusActions if it doesn't exist (for existing data)
        if (!player.bonusActions) {
            player.bonusActions = [false, false];
        }
        
        player.bonusActions[actionIndex] = !player.bonusActions[actionIndex];
        this.saveToStorage();
        this.render();
    }

    removePlayer(name) {
        const player = this.players.find(p => p.name === name);
        if (!player) return;

        // Prevent removing players who have already been eliminated
        if (player.eliminated) {
            this.showRemovePlayerError(name);
            return;
        }

        // Show confirmation modal
        this.showRemovePlayerConfirmation(name);
    }

    showRemovePlayerError(name) {
        document.getElementById('removePlayerMessage').textContent = `Cannot remove ${name}`;
        document.getElementById('removePlayerWarning').textContent = 
            `${name} has already been eliminated. Use the Edit button to remove their score first.`;
        document.getElementById('removePlayerWarning').style.display = 'block';
        
        // Change button to just close
        const confirmBtn = document.getElementById('confirmRemovePlayerBtn');
        confirmBtn.textContent = 'OK';
        confirmBtn.style.display = 'block';
        document.getElementById('cancelRemovePlayerBtn').style.display = 'none';
        
        document.getElementById('removePlayerModal').classList.add('active');
    }

    showRemovePlayerConfirmation(name) {
        this.pendingPlayerToRemove = name;
        document.getElementById('removePlayerMessage').textContent = 
            `Remove ${name} from check-in?\n\nThis cannot be undone.`;
        document.getElementById('removePlayerWarning').style.display = 'none';
        
        // Reset buttons
        const confirmBtn = document.getElementById('confirmRemovePlayerBtn');
        confirmBtn.textContent = 'Remove';
        confirmBtn.style.display = 'block';
        document.getElementById('cancelRemovePlayerBtn').style.display = 'block';
        
        document.getElementById('removePlayerModal').classList.add('active');
    }

    confirmRemovePlayer() {
        if (!this.pendingPlayerToRemove) {
            this.closeRemovePlayerModal();
            return;
        }

        const name = this.pendingPlayerToRemove;
        this.players = this.players.filter(p => p.name !== name);
        
        // If tournament is active, adjust totalPlayers and recalculate bonus points
        if (this.totalPlayers > 0) {
            this.totalPlayers--;
            this.recalculateAllBonusPoints();
        }
        
        this.closeRemovePlayerModal();
        this.saveToStorage();
        this.render();
    }

    closeRemovePlayerModal() {
        this.pendingPlayerToRemove = null;
        document.getElementById('removePlayerModal').classList.remove('active');
        document.getElementById('removePlayerMessage').textContent = '';
        document.getElementById('removePlayerWarning').textContent = '';
        document.getElementById('removePlayerWarning').style.display = 'none';
    }

    // === Tournament Flow ===

    startTournament() {
        if (this.players.length === 0) {
            this.showMessage('No Players', 'Please add players first');
            return;
        }

        this.totalPlayers = this.players.length;
        this.nextEliminationOrder = 1;
        roundSubmissionManager.hasAutoShown = false;
        
        // Reset all players
        this.players.forEach(p => {
            p.eliminationPoints = 0;
            p.bonusPoints = 0;
            p.eliminated = false;
            p.eliminationOrder = null;
        });

        document.getElementById('checkInSection').style.display = 'none';
        document.getElementById('tournamentSection').style.display = 'block';
        
        this.saveToStorage();
        this.render();
    }

    backToCheckIn() {
        document.getElementById('checkInSection').style.display = 'block';
        document.getElementById('tournamentSection').style.display = 'none';
        document.getElementById('roundCompleteSection').style.display = 'none';
        this.render();
    }

    resumeTournament() {
        if (this.totalPlayers === 0) {
            this.showMessage('Tournament Not Started', 'Please start a tournament first');
            return;
        }

        document.getElementById('checkInSection').style.display = 'none';
        document.getElementById('tournamentSection').style.display = 'block';
        this.render();
    }

    // === Elimination Actions ===

    eliminatePlayer(name) {
        const player = this.players.find(p => p.name === name);
        if (!player || player.eliminated) return;

        player.eliminated = true;
        player.eliminationOrder = this.nextEliminationOrder;
        player.eliminationPoints = this.nextEliminationOrder;
        this.recalculateBonusPoints(player);

        this.nextEliminationOrder++;
        this.saveToStorage();
        this.render();
    }

    // === Add Missed Player Modal ===

    openAddMissingPlayerModal() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length === 0) {
            this.showMessage('No Active Players', 'No active players to add');
            return;
        }

        // Reset state
        this.selectedMissingPlayer = null;
        this.selectedMissingPlayerPosition = null;

        // Show step 1 (player selection)
        const select = document.getElementById('selectMissingPlayer');
        select.innerHTML = '<option value="">-- Choose Player --</option>';
        activePlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.name;
            option.textContent = player.name;
            select.appendChild(option);
        });

        // Show step 1, hide step 2
        document.getElementById('addPlayerStep1').style.display = 'block';
        document.getElementById('addPlayerStep2').style.display = 'none';
        
        // Update button visibility
        document.getElementById('backToPlayerSelectBtn').style.display = 'none';
        document.getElementById('confirmEliminateBtn').style.display = 'none';
        document.getElementById('cancelEliminateBtn').style.display = 'inline-block';

        document.getElementById('eliminateModal').classList.add('active');
    }

    showPositionSelection() {
        const playerName = document.getElementById('selectMissingPlayer').value;
        if (!playerName) {
            this.showMessage('Selection Required', 'Please select a player');
            return;
        }

        const player = this.players.find(p => p.name === playerName);
        if (!player || player.eliminated) {
            this.showMessage('Invalid Selection', 'Invalid player selection');
            return;
        }

        this.selectedMissingPlayer = player;
        const eliminatedPlayers = this.getEliminatedPlayers()
            .sort((a, b) => b.eliminationOrder - a.eliminationOrder);

        const container = document.getElementById('positionButtonsContainer');
        container.innerHTML = '';

        if (eliminatedPlayers.length === 0) {
            this.addPositionButton(container, '1st place', 1);
            this.showPositionStep();
            return;
        }

        eliminatedPlayers.forEach(ep => {
            const placement = this.getOrdinalPlace(this.totalPlayers - ep.eliminationOrder + 1);
            this.addPlayerToList(container, `${placement} - ${ep.name}`);
            this.addPositionButton(container, 'Went Out Here', ep.eliminationOrder);
        });

        this.showPositionStep();
    }

    addPlayerToList(container, text) {
        const div = document.createElement('div');
        div.className = 'position-player-name';
        div.textContent = text;
        container.appendChild(div);
    }

    addPositionButton(container, text, position) {
        const btn = document.createElement('button');
        btn.className = 'position-button';
        btn.textContent = text;
        btn.addEventListener('click', (e) => this.selectPosition(position, e.currentTarget));
        container.appendChild(btn);
    }

    showPositionStep() {
        document.getElementById('addPlayerStep1').style.display = 'none';
        document.getElementById('addPlayerStep2').style.display = 'block';
        document.getElementById('backToPlayerSelectBtn').style.display = 'inline-block';
        document.getElementById('confirmEliminateBtn').style.display = 'none';
        document.getElementById('cancelEliminateBtn').style.display = 'inline-block';
    }

    selectPosition(position, buttonElement) {
        this.selectedMissingPlayerPosition = position;
        
        // Update button styling to show selection
        const buttons = document.querySelectorAll('.position-button');
        buttons.forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Mark the clicked button as selected
        if (buttonElement) {
            buttonElement.classList.add('selected');
        }
        
        // Immediately confirm and add the player
        this.confirmEliminate();
    }

    backToPlayerSelection() {
        this.selectedMissingPlayer = null;
        this.selectedMissingPlayerPosition = null;

        // Show step 1, hide step 2
        document.getElementById('addPlayerStep1').style.display = 'block';
        document.getElementById('addPlayerStep2').style.display = 'none';
        document.getElementById('selectMissingPlayer').value = '';
        
        // Update button visibility
        document.getElementById('backToPlayerSelectBtn').style.display = 'none';
        document.getElementById('confirmEliminateBtn').style.display = 'none';
        document.getElementById('cancelEliminateBtn').style.display = 'inline-block';
    }

    confirmEliminate() {
        if (!this.selectedMissingPlayer || !this.selectedMissingPlayerPosition) {
            this.showMessage('Selection Required', 'Please select a player and position');
            return;
        }

        const player = this.selectedMissingPlayer;
        const position = this.selectedMissingPlayerPosition;

        // Shift all players at or after this position up by one
        this.shiftPlayersUp(position);

        // Insert player at the specified position
        player.eliminated = true;
        player.eliminationOrder = position;
        player.eliminationPoints = position;
        this.recalculateBonusPoints(player);

        // Warm up server when top 3 finalists are eliminated
        if (position >= 1 && position <= 3) {
            roundSubmissionManager.warmupServer();
        }

        this.updateNextEliminationOrder();
        this.saveToStorage();
        this.closeEliminateModal();
        this.render();
    }

    closeEliminateModal() {
        document.getElementById('selectMissingPlayer').value = '';
        this.selectedMissingPlayer = null;
        this.selectedMissingPlayerPosition = null;
        document.getElementById('eliminateModal').classList.remove('active');
    }

    // === Similar Names Modal ===

    showSimilarNamesModal(inputName, similarNames, matchType = 'similar') {
        this.pendingPlayerName = inputName;
        
        // Set intro text based on match type
        let introText;
        if (matchType === 'firstNameMatch') {
            introText = `"${inputName}" is not found in the system. Did you mean one of these players with the same first name?`;
        } else {
            introText = `"${inputName}" is not found in the system. Did you mean one of these?`;
        }
        
        document.getElementById('similarNamesIntro').textContent = introText;
        
        // Clear and populate similar names list
        const namesList = document.getElementById('similarNamesList');
        namesList.innerHTML = '';
        
        similarNames.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'similar-name-btn';
            btn.textContent = name;
            btn.addEventListener('click', () => this.selectSimilarName(name));
            namesList.appendChild(btn);
        });
        
        // Show modal
        document.getElementById('similarNamesModal').classList.add('active');
    }

    showValidationErrorModal(inputName, validationErrors, similarNames) {
        this.pendingPlayerName = inputName;
        
        // Set intro text with validation error message
        let introText = validationErrors.join('\n') + '\n\nDid you mean one of these?';
        
        document.getElementById('similarNamesIntro').innerHTML = 
            `<span style="color: #d32f2f;">${validationErrors.join('<br>')}</span><br><br>Did you mean one of these?`;
        
        // Clear and populate similar names list
        const namesList = document.getElementById('similarNamesList');
        namesList.innerHTML = '';
        
        similarNames.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'similar-name-btn';
            btn.textContent = name;
            btn.addEventListener('click', () => this.selectSimilarName(name));
            namesList.appendChild(btn);
        });
        
        // Show modal
        document.getElementById('similarNamesModal').classList.add('active');
    }

    selectSimilarName(name) {
        const input = document.getElementById('playerNameInput');
        
        // Add the selected player
        this.players.push({
            name: name,
            eliminationPoints: 0,
            bonusPoints: 0,
            eliminated: false,
            eliminationOrder: null,
            bonusActions: [false, false]
        });

        if (this.totalPlayers > 0) {
            this.totalPlayers++;
            this.recalculateAllBonusPoints();
        }

        input.value = '';
        this.closeSimilarNamesModal();
        this.saveToStorage();
        this.render();
    }

    showNewPlayerConfirmation(name) {
        this.pendingPlayerName = name;
        this.closeSimilarNamesModal();
        
        // Show the new player modal
        document.getElementById('newPlayerModalText').textContent = 
            `"${name}" is not found in the system.`;
        document.getElementById('newPlayerConfirmInput').value = '';
        document.getElementById('newPlayerModalError').style.display = 'none';
        document.getElementById('newPlayerModal').classList.add('active');
        
        // Focus on the input field
        setTimeout(() => {
            document.getElementById('newPlayerConfirmInput').focus();
        }, 100);
    }

    confirmNewPlayerInput() {
        const input = document.getElementById('newPlayerConfirmInput').value.toLowerCase().trim();
        const errorDiv = document.getElementById('newPlayerModalError');
        
        if (input === 'new player') {
            // Valid confirmation, add the player
            this.closeNewPlayerModal();
            this.addAsNewPlayer();
        } else {
            // Show error message
            errorDiv.textContent = 'Please type exactly "new player" to confirm.';
            errorDiv.style.display = 'block';
            document.getElementById('newPlayerConfirmInput').value = '';
            document.getElementById('newPlayerConfirmInput').focus();
        }
    }

    closeNewPlayerModal() {
        document.getElementById('newPlayerModal').classList.remove('active');
        document.getElementById('newPlayerConfirmInput').value = '';
        document.getElementById('newPlayerModalError').style.display = 'none';
    }

    addAsNewPlayer() {
        const input = document.getElementById('playerNameInput');
        
        // Add the new player
        this.players.push({
            name: this.pendingPlayerName,
            eliminationPoints: 0,
            bonusPoints: 0,
            eliminated: false,
            eliminationOrder: null,
            bonusActions: [false, false]
        });

        if (this.totalPlayers > 0) {
            this.totalPlayers++;
            this.recalculateAllBonusPoints();
        }

        input.value = '';
        this.pendingPlayerName = null;
        this.saveToStorage();
        this.render();
    }

    closeSimilarNamesModal() {
        document.getElementById('similarNamesModal').classList.remove('active');
        document.getElementById('similarNamesIntro').textContent = '';
        document.getElementById('similarNamesList').innerHTML = '';
        document.getElementById('continueNewPlayerBtn').textContent = 'Add as New Player';
    }

    // === Edit Modal ===

    openEditModal(name) {
        const player = this.players.find(p => p.name === name);
        if (!player || !player.eliminated) return;

        this.editingPlayer = player;
        document.getElementById('editPlayerName').textContent = player.name;
        document.getElementById('editModal').classList.add('active');
    }

    closeEditModal() {
        this.editingPlayer = null;
        document.getElementById('editModal').classList.remove('active');
    }


    removeScore() {
        if (!this.editingPlayer) return;

        const removedPosition = this.editingPlayer.eliminationOrder;

        // Shift all players after this position down by one
        this.shiftPlayersDown(removedPosition);

        // Reset this player
        this.editingPlayer.eliminationPoints = 0;
        this.editingPlayer.bonusPoints = 0;
        this.editingPlayer.eliminated = false;
        this.editingPlayer.eliminationOrder = null;

        this.updateNextEliminationOrder();
        this.saveToStorage();
        this.closeEditModal();
        this.render();
    }

    // === Validation ===

    validateEliminationOrder() {
        const eliminated = this.getEliminatedPlayers();
        if (eliminated.length === 0) return [];

        const issues = [];
        const positionMap = {}; // position -> [player names]
        
        // Build position map
        eliminated.forEach(player => {
            const pos = player.eliminationOrder;
            if (!positionMap[pos]) {
                positionMap[pos] = [];
            }
            positionMap[pos].push(player.name);
        });

        // Check for duplicates and gaps
        for (let pos = 1; pos <= eliminated.length; pos++) {
            const playersAtPosition = positionMap[pos] || [];
            
            if (playersAtPosition.length === 0) {
                issues.push(`Missing position ${pos} in elimination sequence`);
            } else if (playersAtPosition.length > 1) {
                issues.push(`Position ${pos} has multiple players: ${playersAtPosition.join(', ')}`);
            }
        }

        return issues;
    }

    showValidationWarning() {
        const issues = this.validateEliminationOrder();
        const warningDiv = document.getElementById('validationWarning');

        if (issues.length > 0) {
            const issuesList = issues.map(issue => `<li>${issue}</li>`).join('');
            warningDiv.innerHTML = `
                <h4>⚠️ Elimination Order Issues Detected</h4>
                <ul>${issuesList}</ul>
                <p><strong>Please fix these issues by editing player positions.</strong></p>
            `;
            warningDiv.style.display = 'block';
        } else {
            warningDiv.style.display = 'none';
        }
    }

    // === Storage & Reset ===

    exportResults() {
        const eliminated = this.getEliminatedPlayers();
        if (eliminated.length === 0) {
            this.showMessage('No Results', 'No results to export yet');
            return;
        }

        const leaderboard = document.querySelector('.leaderboard');
        if (!leaderboard) {
            console.error('Leaderboard element not found');
            return;
        }

        // Hide buttons during capture
        const buttons = [
            document.getElementById('exportResultsBtn'),
            document.getElementById('submitRoundBtn')
        ];
        const originalDisplays = buttons.map(btn => btn?.style.display);
        buttons.forEach(btn => { if (btn) btn.style.display = 'none'; });

        // Capture and download
        html2canvas(leaderboard, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollY: -window.scrollY,
            windowHeight: leaderboard.scrollHeight + 100
        }).then(canvas => {
            // Restore buttons
            buttons.forEach((btn, i) => { if (btn) btn.style.display = originalDisplays[i]; });
            
            // Download
            canvas.toBlob(blob => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `tournament-results-${new Date().toISOString().split('T')[0]}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            });
        }).catch(err => {
            buttons.forEach((btn, i) => { if (btn) btn.style.display = originalDisplays[i]; });
            console.error('Screenshot error:', err);
        });
    }

    clearAll() {
        this.players = [];
        this.totalPlayers = 0;
        this.nextEliminationOrder = 1;
        roundSubmissionManager.hasAutoShown = false;
        localStorage.removeItem('tournamentData');
        
        document.getElementById('checkInSection').style.display = 'block';
        document.getElementById('tournamentSection').style.display = 'none';
        document.getElementById('roundCompleteSection').style.display = 'none';
        
        this.render();
    }

    saveToStorage() {
        const data = {
            players: this.players,
            totalPlayers: this.totalPlayers,
            nextEliminationOrder: this.nextEliminationOrder
        };
        localStorage.setItem('tournamentData', JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem('tournamentData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.players = parsed.players || [];
                this.totalPlayers = parsed.totalPlayers || 0;
                this.nextEliminationOrder = parsed.nextEliminationOrder || 1;

                // If tournament was in progress, show tournament section
                if (this.totalPlayers > 0) {
                    document.getElementById('checkInSection').style.display = 'none';
                    document.getElementById('tournamentSection').style.display = 'block';
                }
            } catch (e) {
                console.error('Error loading data:', e);
            }
        }
    }

    // === Rendering ===

    render() {
        this.renderCheckIn();
        this.renderTournament();
    }

    renderCheckIn() {
        const playerListDiv = document.getElementById('checkedInPlayers');
        const playerCountSpan = document.getElementById('playerCount');
        const startBtn = document.getElementById('startTournamentBtn');
        const resumeBtn = document.getElementById('resumeTournamentBtn');

        playerListDiv.innerHTML = '';
        this.players.forEach(player => {
            const chip = document.createElement('div');
            chip.className = 'player-chip';
            
            // Initialize bonusActions if it doesn't exist (for existing data)
            if (!player.bonusActions) {
                player.bonusActions = [false, false];
            }
            
            // Show indicator if player has been eliminated
            const indicator = player.eliminated ? ' ✓' : '';
            
            // Calculate bonus chips
            const bonusChips = (player.bonusActions[0] ? 2.5 : 0) + (player.bonusActions[1] ? 2.5 : 0);
            const bonusDisplay = bonusChips > 0 ? `<div class="bonus-display">+${bonusChips}k</div>` : '<div class="bonus-display">&nbsp;</div>';
            
            chip.innerHTML = `
                <div class="name-container">
                    <span class="name">${player.name}${indicator}</span>
                    ${bonusDisplay}
                </div>
                <div class="bonus-actions">
                    <button class="bonus-btn ${player.bonusActions[0] ? 'active' : ''}" 
                            onclick="scorer.toggleBonusAction('${player.name}', 0)"
                            title="Bonus Action 1 (2.5k)">◻</button>
                    <button class="bonus-btn ${player.bonusActions[1] ? 'active' : ''}" 
                            onclick="scorer.toggleBonusAction('${player.name}', 1)"
                            title="Bonus Action 2 (2.5k)">◻</button>
                </div>
                <button class="remove-btn" onclick="scorer.removePlayer('${player.name}')">×</button>
            `;
            playerListDiv.appendChild(chip);
        });

        playerCountSpan.textContent = this.players.length;
        
        // Show start button if no tournament, resume if tournament active
        if (this.totalPlayers > 0) {
            startBtn.style.display = 'none';
            resumeBtn.style.display = 'block';
        } else {
            startBtn.style.display = this.players.length > 0 ? 'block' : 'none';
            resumeBtn.style.display = 'none';
        }
    }

    renderTournament() {
        if (this.totalPlayers === 0) return;

        const eliminated = this.getEliminatedPlayers();
        const active = this.getActivePlayers();

        // Update header info
        document.getElementById('totalPlayers').textContent = this.totalPlayers;
        document.getElementById('nextElimination').textContent = this.nextEliminationOrder;
        
        // Hide Next Elimination if no active players left
        const nextEliminationSpan = document.getElementById('nextElimination').parentElement;
        nextEliminationSpan.style.display = active.length > 0 ? '' : 'none';
        
        document.getElementById('playersRemaining').textContent = this.totalPlayers - (this.nextEliminationOrder - 1);

        // Show/hide Add Missed Player button (only if someone eliminated and players still active)
        const addMissingBtn = document.getElementById('addMissingPlayerBtn');
        addMissingBtn.style.display = (eliminated.length > 0 && active.length > 0) ? '' : 'none';

        // Check for validation issues
        this.showValidationWarning();

        // Render sub-sections
        this.renderLeaderboard();
        this.renderActivePlayers();
    }

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboardBody');
        const eliminated = this.getEliminatedPlayers();
        const exportBtn = document.getElementById('exportResultsBtn');
        const submitBtn = document.getElementById('submitRoundBtn');

        // Check if tournament is complete (same logic as before)
        const isComplete = (eliminated.length === this.totalPlayers && this.totalPlayers > 0);
        
        if (isComplete) {
            exportBtn.style.display = 'block';
            exportBtn.classList.add('tournament-complete');
            submitBtn.style.display = 'block';
        } else {
            exportBtn.style.display = 'none';
            exportBtn.classList.remove('tournament-complete');
            submitBtn.style.display = 'none';
        }

        if (eliminated.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No players eliminated yet</td></tr>';
            return;
        }

        // Sort by total points descending (best score first)
        const sorted = [...eliminated].sort((a, b) => {
            const totalA = a.eliminationPoints + a.bonusPoints;
            const totalB = b.eliminationPoints + b.bonusPoints;
            return totalB - totalA;
        });

        tbody.innerHTML = '';
        sorted.forEach((player, index) => {
            const row = document.createElement('tr');
            const total = player.eliminationPoints + player.bonusPoints;
            const tournamentRank = this.totalPlayers - player.eliminationOrder + 1;
            
            // Format points display
            let pointsDisplay;
            if (player.bonusPoints > 0) {
                pointsDisplay = `<strong>${total}</strong> = ${player.eliminationPoints} + ${player.bonusPoints}`;
            } else {
                pointsDisplay = `<strong>${player.eliminationPoints}</strong>`;
            }

            // === ONLY apply gold/silver/bronze when tournament is complete ===
            row.classList.remove('first-place', 'second-place', 'third-place');
            
            if (isComplete) {
                if (index === 0) row.classList.add('first-place');
                else if (index === 1) row.classList.add('second-place');
                else if (index === 2) row.classList.add('third-place');
            }

            row.innerHTML = `
                <td>${tournamentRank}</td>
                <td><strong>${player.name}</strong></td>
                <td>${pointsDisplay}</td>
                <td><button class="edit-btn btn-danger" onclick="scorer.openEditModal('${player.name}')">✕</button></td>
            `;
            tbody.appendChild(row);
        });

        // Show round complete screen after rendering leaderboard
        // TEMPORARILY DISABLED - Will enable again when making this feature mandatory
        // if (isComplete) {
        //     roundSubmissionManager.showRoundCompleteScreen(true);
        // }
    }

    renderActivePlayers() {
        const activeList = document.getElementById('activePlayersList');
        activeList.innerHTML = '';

        // Sort players alphabetically by name
        const sortedPlayers = [...this.players].sort((a, b) => a.name.localeCompare(b.name));

        sortedPlayers.forEach(player => {
            const btn = document.createElement('button');
            btn.className = player.eliminated ? 'player-btn eliminated' : 'player-btn';
            btn.textContent = player.name;
            btn.disabled = player.eliminated;
            
            if (!player.eliminated) {
                btn.addEventListener('click', () => this.eliminatePlayer(player.name));
            }

            activeList.appendChild(btn);
        });
    }
}

// Initialize the application
const scorer = new TournamentScorer();
