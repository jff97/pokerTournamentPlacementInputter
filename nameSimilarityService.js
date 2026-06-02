/**
 * Name Similarity Service
 * Handles name similarity detection using fuzzy matching rules
 * Future functionality placeholder - not currently connected to the application
 */
class NameSimilarityService {
    // Configuration - matches Python backend config
    static CONFIG = {
        NAME_SIMILARITY_THRESHOLD: 79.9,  // Percentage threshold for name similarity (matches Python)
        SINGLE_INITIAL_MATCH: 100          // Perfect score for single initial matching
    };

    /**
     * Find all similar names from a list
     * @param {string} inputName - The name to find similarities for
     * @param {string[]} allNames - Array of names to search through
     * @returns {string[]} - All similar names found
     */
    static findAllSimilarNames(inputName, allNames) {
        return allNames.filter(name => this.areNamesSimilar(inputName, name));
    }

    /**
     * Check if two names are similar based on fuzzy matching rules
     * @param {string} name1 - First name
     * @param {string} name2 - Second name
     * @returns {boolean} - True if names are similar
     */
    static areNamesSimilar(name1, name2) {
        // Exact duplicates are not considered similar
        if (name1 === name2) {
            return false;
        }

        const [first1, last1] = this.splitName(name1);
        const [first2, last2] = this.splitName(name2);

        const firstNameScore = this.levenshteinSimilarity(first1, first2);
        const lastNameScore = this.calculateLastNameScore(last1, last2);

        return (
            firstNameScore > NameSimilarityService.CONFIG.NAME_SIMILARITY_THRESHOLD &&
            lastNameScore >= NameSimilarityService.CONFIG.NAME_SIMILARITY_THRESHOLD
        );
    }

    /**
     * Split a name into first and last parts
     * @param {string} name - Full name
     * @returns {[string, string]} - [firstName, lastName]
     */
    static splitName(name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return [parts[0], ''];
        }
        return [parts[0], parts[parts.length - 1]];
    }

    /**
     * Calculate similarity score for last names with special handling for initials
     * @param {string} last1 - First last name
     * @param {string} last2 - Second last name
     * @returns {number} - Similarity score (0-100)
     */
    static calculateLastNameScore(last1, last2) {
        const empty1 = !last1 || last1.trim() === '';
        const empty2 = !last2 || last2.trim() === '';

        // Both last names are missing
        if (empty1 && empty2) {
            return NameSimilarityService.CONFIG.SINGLE_INITIAL_MATCH;
        }

        // Exactly one last name is missing - consider it similar
        if (empty1 || empty2) {
            return NameSimilarityService.CONFIG.SINGLE_INITIAL_MATCH;
        }

        // One is a single initial matching the first letter of the other
        if (last1.length === 1 && last2 && last2[0].toLowerCase() === last1[0].toLowerCase()) {
            return NameSimilarityService.CONFIG.SINGLE_INITIAL_MATCH;
        }

        if (last2.length === 1 && last1 && last1[0].toLowerCase() === last2[0].toLowerCase()) {
            return NameSimilarityService.CONFIG.SINGLE_INITIAL_MATCH;
        }

        // Both are multi-letter last names - fuzzy compare
        return this.levenshteinSimilarity(last1, last2);
    }

    /**
     * Calculate Levenshtein distance-based similarity score (0-100)
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} - Similarity percentage (0-100)
     */
    static levenshteinSimilarity(str1, str2) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();

        const len = Math.max(s1.length, s2.length);
        if (len === 0) return 100;

        const distance = this.levenshteinDistance(s1, s2);
        return Math.round(((len - distance) / len) * 100);
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} - Levenshtein distance
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }
}
