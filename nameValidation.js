/**
 * Name Validation Module
 * Handles all validation rules for player check-in names.
 * Easily extensible for adding new validation criteria.
 */

/**
 * Validates a player name for check-in.
 * Returns an array of validation error messages (empty array if valid).
 * Add new validation rules here to expand criteria.
 * 
 * @param {string} name - The player name to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateCheckInName(name) {
    const errors = [];

    // Rule 1: Name must have at least 2 parts (first name and last name/initial)
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
        errors.push('Names without last initials or full last name are not allowed');
    }


    return errors;
}

/**
 * Fetches the list of all player names from the system
 * @returns {Promise<string[]>} Array of player names
 * @throws {Error} If fetch fails or data is invalid
 */
function getPlayerNames() {
    return fetch('https://jff97.github.io/PokerAnalyzerDisplayWebsite/static/cachedLeaderboards/player-names.json')
        .then(response => response.json())
        .then(data => {
            // Extract playerNames array from the response object
            if (data && Array.isArray(data.playerNames)) {
                return data.playerNames;
            }
            throw new Error('Invalid player data format');
        });
}

function checkNameExists(name) {
    // Returns true if name exists in system, false if new
    // Throws error if system is empty or fetch fails
    
    return getPlayerNames().then(playerNames => {
        if (playerNames.length === 0) {
            throw new Error('Player database is empty');
        }

        const lowerName = name.toLowerCase().trim();
        return playerNames.some(p => p.toLowerCase().trim() === lowerName);
    });
}

/**
 * Gets similar names from the system for a given input
 * @param {string} name - The input name to check
 * @returns {Promise<string[]>} Array of similar names found
 */
function getSimilarNames(name) {
    return getPlayerNames()
        .then(playerNames => {
            console.log('Looking for similar names for:', name);
            console.log('Available player names:', playerNames);
            const result = findSimilarNames(name, playerNames);
            console.log('Similar names found:', result);
            return result;
        })
        .catch(error => {
            console.error('Error getting similar names:', error);
            return [];
        });
}

/**
 * Finds similar names to the input using the NameSimilarityService
 * @param {string} inputName - The input name to check
 * @param {string[]} allPlayerNames - Array of existing player names
 * @returns {string[]} Array of similar names found (max 5)
 */
function findSimilarNames(inputName, allPlayerNames) {
    if (typeof NameSimilarityService === 'undefined') {
        console.warn('NameSimilarityService not loaded');
        return [];
    }
    
    // Use NameSimilarityService to find all similar names
    const similarNames = NameSimilarityService.findAllSimilarNames(inputName, allPlayerNames);
    
    // Return top 7 similar names
    return similarNames.slice(0, 7);
}

/**
 * Gets players with the same first name as the input
 * @param {string} name - The input name to check
 * @returns {Promise<string[]>} Array of player names with same first name (max 5)
 */
function getPlayersByFirstName(name) {
    return getPlayerNames()
        .then(playerNames => {
            // Extract first name from input
            const inputFirstName = name.trim().split(/\s+/)[0].toLowerCase();
            
            // Filter players with matching first name
            const matchingPlayers = playerNames.filter(playerName => {
                const playerFirstName = playerName.trim().split(/\s+/)[0].toLowerCase();
                return playerFirstName === inputFirstName;
            });
            
            console.log('Players with first name "' + inputFirstName + '":', matchingPlayers);
            
            // Return top 7
            return matchingPlayers.slice(0, 7);
        })
        .catch(error => {
            console.error('Error getting players by first name:', error);
            return [];
        });
}
