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
        .then(playerNames => findSimilarNames(name, playerNames))
        .catch(error => {
            console.error('Error getting similar names:', error);
            return [];
        });
}

/**
 * Finds similar names to the input using a simple string similarity check
 * @param {string} inputName - The input name to check
 * @param {string[]} allPlayerNames - Array of existing player names
 * @returns {string[]} Array of similar names found
 */
function findSimilarNames(inputName, allPlayerNames) {
    inputName = inputName.toLowerCase().trim();
    const similar = [];
    
    allPlayerNames.forEach(playerName => {
        const curPlayerName = playerName.toLowerCase().trim();
        
        // Check if one contains the other (substring match)
        if (curPlayerName.includes(inputName) || inputName.includes(curPlayerName)) {
            similar.push(playerName);
            return;
        }
        
        // Check if names are similar
        if (isSimilar(inputName, curPlayerName)) {
            similar.push(playerName);
        }
    });
    
    return similar.slice(0, 5); // Return top 5 similar names
}

/**
 * Determines if two names are similar
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {boolean} True if names are similar
 */
function isSimilar(name1, name2) {
    // TODO: Implement similarity check (e.g., Levenshtein distance, phonetic matching, etc.)
    return false;
}
