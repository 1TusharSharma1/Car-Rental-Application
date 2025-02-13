/**
 * Check if the given value is a non-empty string.
 * @param {any} value 
 * @returns {boolean}
 */
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }
  
  /**
   * Validate an email address.
   * @param {string} email 
   * @returns {boolean}
   */
  function isValidEmail(email) {
    const emailRegex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
    return isNonEmptyString(email) && emailRegex.test(email);
  }
  
  /**
   * Validate a username.
   * Requirements: 3-20 characters; can contain letters, numbers, and underscores.
   * @param {string} username 
   * @returns {boolean}
   */
  function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return isNonEmptyString(username) && usernameRegex.test(username);
  }
  
  /**
   * Validate a password.
   * Requirements: at least 6 characters, include at least one uppercase letter, one number, and one special character.
   * @param {string} password 
   * @returns {boolean}
   */
  function isValidPassword(password) {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return typeof password === 'string' && passwordRegex.test(password);
  }
  
  /**
   * Check whether two passwords match.
   * @param {string} password 
   * @param {string} confirmPassword 
   * @returns {boolean}
   */
  function passwordsMatch(password, confirmPassword) {
    return password === confirmPassword;
  }
  
  /**
   * Validate a business name.
   * Requirements: non-empty and at least 3 characters long.
   * @param {string} name 
   * @returns {boolean}
   */
  function isValidBusinessName(name) {
    return isNonEmptyString(name) && name.trim().length >= 3;
  }
  
  /**
   * Check if a number is positive (greater than 0).
   * @param {number} value 
   * @returns {boolean}
   */
  function isPositiveNumber(value) {
    return typeof value === 'number' && value > 0;
  }
  
  /**
   * Validate a bid amount.
   * The bid must be a positive number and meet or exceed the minimum bid.
   * @param {number} bidAmount 
   * @param {number} minBid 
   * @returns {boolean}
   */
  function isValidBidAmount(bidAmount, minBid) {
    return isPositiveNumber(bidAmount) && bidAmount >= minBid;
  }
  
  /**
   * Validate a date range.
   * The start date must be on or before the end date.
   * @param {string|Date} startDate 
   * @param {string|Date} endDate 
   * @returns {boolean}
   */
  function isValidDateRange(startDate, endDate) {
    if (!startDate || !endDate) return false;
    return new Date(startDate) <= new Date(endDate);
  }
  
  /**
   * Check if all provided fields (strings) are filled (non-empty).
   * @param  {...any} fields 
   * @returns {boolean}
   */
  function areFieldsFilled(...fields) {
    return fields.every(field => isNonEmptyString(field));
  }
  
  /**
   * Validate that two IDs are different.
   * Useful to ensure that a user is not, for example, bidding on their own listing.
   * @param {string} id1 
   * @param {string} id2 
   * @returns {boolean}
   */
  function areDifferentIds(id1, id2) {
    return id1 !== id2;
  }
  
  /**
   * Validate a driver's license input.
   * (In this case, simply checks that the input is a non-empty string.)
   * @param {string} driverLicense 
   * @returns {boolean}
   */
  function isValidDriverLicense(driverLicense) {
    return isNonEmptyString(driverLicense);
  }
  
  /**
   * Check if a user has the required role.
   * @param {object} user - The user object containing a user_role array.
   * @param {string} role - The required role.
   * @returns {boolean}
   */
  function hasRequiredRole(user, role) {
    return user && Array.isArray(user.user_role) && user.user_role.includes(role);
  }
  
  /**
   * Generic numeric validation.
   * Checks that the value is a number (not NaN).
   * @param {any} value 
   * @returns {boolean}
   */
  function isValidNumber(value) {
    return !isNaN(value) && typeof value === 'number';
  }
  
  // Export all the validation functions (for ES modules)
  export {
    isNonEmptyString,
    isValidEmail,
    isValidUsername,
    isValidPassword,
    passwordsMatch,
    isValidBusinessName,
    isPositiveNumber,
    isValidBidAmount,
    isValidDateRange,
    areFieldsFilled,
    areDifferentIds,
    isValidDriverLicense,
    hasRequiredRole,
    isValidNumber
  };
  