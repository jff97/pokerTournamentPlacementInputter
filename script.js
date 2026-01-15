// Tournament Scorer Application
class TournamentScorer {
    constructor() {
        this.players = [];
        this.totalPlayers = 0;
        this.nextEliminationOrder = 1;
        this.editingPlayer = null;
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.attachEventListeners();
        this.render();
    }

    // === Helper Methods ===
    
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
        
        // Edit Modal
        document.getElementById('saveEditBtn').addEventListener('click', () => this.saveEdit());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.closeEditModal());
        document.getElementById('removeScoreBtn').addEventListener('click', () => this.removeScore());
        
        // Eliminate Modal
        document.getElementById('confirmEliminateBtn').addEventListener('click', () => this.confirmEliminate());
        document.getElementById('cancelEliminateBtn').addEventListener('click', () => this.closeEliminateModal());
    }

    // === Player Management ===

    addPlayer() {
        const input = document.getElementById('playerNameInput');
        const name = input.value.trim();
        
        if (!name) {
            alert('Please enter a player name');
            return;
        }

        if (this.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert('Player already exists');
            return;
        }

        this.players.push({
            name: name,
            eliminationPoints: 0,
            bonusPoints: 0,
            eliminated: false,
            eliminationOrder: null
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

    removePlayer(name) {
        const player = this.players.find(p => p.name === name);
        if (!player) return;

        // Prevent removing players who have already been eliminated
        if (player.eliminated) {
            alert(`Cannot remove ${name} - they have already been eliminated. Use the Edit button to remove their score first.`);
            return;
        }

        this.players = this.players.filter(p => p.name !== name);
        
        // If tournament is active, adjust totalPlayers and recalculate bonus points
        if (this.totalPlayers > 0) {
            this.totalPlayers--;
            // Recalculate bonus points for all eliminated players with new totalPlayers count
            this.recalculateAllBonusPoints();
        }
        
        this.saveToStorage();
        this.render();
    }

    // === Tournament Flow ===

    startTournament() {
        if (this.players.length === 0) {
            alert('Please add players first');
            return;
        }

        this.totalPlayers = this.players.length;
        this.nextEliminationOrder = 1;
        
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
        this.render();
    }

    resumeTournament() {
        if (this.totalPlayers === 0) {
            alert('Please start a tournament first');
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
            alert('No active players to add');
            return;
        }

        const select = document.getElementById('selectMissingPlayer');
        select.innerHTML = '<option value="">-- Choose Player --</option>';
        activePlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.name;
            option.textContent = player.name;
            select.appendChild(option);
        });

        document.getElementById('eliminatePosition').value = this.nextEliminationOrder;
        document.getElementById('eliminateModal').classList.add('active');
    }

    confirmEliminate() {
        const playerName = document.getElementById('selectMissingPlayer').value;
        if (!playerName) {
            alert('Please select a player');
            return;
        }

        const player = this.players.find(p => p.name === playerName);
        if (!player || player.eliminated) {
            alert('Invalid player selection');
            return;
        }

        const position = parseInt(document.getElementById('eliminatePosition').value);
        if (isNaN(position) || position < 1 || position > this.totalPlayers) {
            alert(`Please enter a valid elimination order (1-${this.totalPlayers})`);
            return;
        }

        // Shift all players at or after this position up by one
        this.shiftPlayersUp(position);

        // Insert player at the specified position
        player.eliminated = true;
        player.eliminationOrder = position;
        player.eliminationPoints = position;
        this.recalculateBonusPoints(player);

        this.updateNextEliminationOrder();
        this.saveToStorage();
        this.closeEliminateModal();
        this.render();
    }

    closeEliminateModal() {
        document.getElementById('selectMissingPlayer').value = '';
        document.getElementById('eliminateModal').classList.remove('active');
    }

    // === Edit Modal ===

    openEditModal(name) {
        const player = this.players.find(p => p.name === name);
        if (!player || !player.eliminated) return;

        this.editingPlayer = player;
        document.getElementById('editPlayerName').textContent = player.name;
        document.getElementById('editEliminationOrder').value = player.eliminationOrder;
        document.getElementById('editModal').classList.add('active');
    }

    closeEditModal() {
        this.editingPlayer = null;
        document.getElementById('editModal').classList.remove('active');
    }

    saveEdit() {
        if (!this.editingPlayer) return;

        const newPosition = parseInt(document.getElementById('editEliminationOrder').value);
        if (isNaN(newPosition) || newPosition < 1 || newPosition > this.totalPlayers) {
            alert(`Please enter a valid elimination order (1-${this.totalPlayers})`);
            return;
        }

        const oldPosition = this.editingPlayer.eliminationOrder;

        if (oldPosition !== newPosition) {
            if (newPosition < oldPosition) {
                // Moving earlier: shift players in range [newPosition, oldPosition) up by 1
                this.players.forEach(player => {
                    if (player.eliminated && player.name !== this.editingPlayer.name) {
                        if (player.eliminationOrder >= newPosition && player.eliminationOrder < oldPosition) {
                            player.eliminationOrder++;
                            player.eliminationPoints = player.eliminationOrder;
                            this.recalculateBonusPoints(player);
                        }
                    }
                });
            } else {
                // Moving later: shift players in range (oldPosition, newPosition] down by 1
                this.players.forEach(player => {
                    if (player.eliminated && player.name !== this.editingPlayer.name) {
                        if (player.eliminationOrder > oldPosition && player.eliminationOrder <= newPosition) {
                            player.eliminationOrder--;
                            player.eliminationPoints = player.eliminationOrder;
                            this.recalculateBonusPoints(player);
                        }
                    }
                });
            }
        }

        // Update the edited player
        this.editingPlayer.eliminationOrder = newPosition;
        this.editingPlayer.eliminationPoints = newPosition;
        this.recalculateBonusPoints(this.editingPlayer);

        this.saveToStorage();
        this.closeEditModal();
        this.render();
    }

    removeScore() {
        if (!this.editingPlayer) return;

        if (!confirm(`Remove score for ${this.editingPlayer.name}? This will allow them to be eliminated again.`)) {
            return;
        }

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

    clearAll() {
        if (!confirm('This will clear ALL data including players and scores. Are you sure?')) {
            return;
        }

        this.players = [];
        this.totalPlayers = 0;
        this.nextEliminationOrder = 1;
        localStorage.removeItem('tournamentData');
        
        document.getElementById('checkInSection').style.display = 'block';
        document.getElementById('tournamentSection').style.display = 'none';
        
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
            
            // Show indicator if player has been eliminated
            const indicator = player.eliminated ? ' ✓' : '';
            
            chip.innerHTML = `
                <span class="name">${player.name}${indicator}</span>
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

        if (eliminated.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No players eliminated yet</td></tr>';
            return;
        }

        // Sort by total points descending
        const sorted = [...eliminated].sort((a, b) => {
            const totalA = a.eliminationPoints + a.bonusPoints;
            const totalB = b.eliminationPoints + b.bonusPoints;
            return totalB - totalA;
        });

        tbody.innerHTML = '';
        sorted.forEach((player, index) => {
            const row = document.createElement('tr');
            const total = player.eliminationPoints + player.bonusPoints;
            
            // Add styling for top 3 ranks
            if (index === 0) row.classList.add('first-place');
            else if (index === 1) row.classList.add('second-place');
            else if (index === 2) row.classList.add('third-place');

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${player.name}</strong></td>
                <td>${player.eliminationPoints}</td>
                <td>${player.bonusPoints > 0 ? player.bonusPoints : '-'}</td>
                <td><strong>${total}</strong></td>
                <td><button class="edit-btn" onclick="scorer.openEditModal('${player.name}')">Edit</button></td>
            `;
            tbody.appendChild(row);
        });
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
