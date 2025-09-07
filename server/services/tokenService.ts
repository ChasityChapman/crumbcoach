import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface TokenGenerationOptions {
  length?: number;
  expiryHours?: number;
  includeSpecialChars?: boolean;
  excludeAmbiguous?: boolean;
}

export interface SecureToken {
  token: string;
  hashedToken: string;
  expiresAt: Date;
  metadata: {
    createdAt: Date;
    purpose: string;
    strength: 'low' | 'medium' | 'high' | 'maximum';
  };
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  remainingTimeMs?: number;
  reason?: string;
}

export class TokenService {
  /**
   * Generate a secure random token for password reset
   */
  static generatePasswordResetToken(options: TokenGenerationOptions = {}): SecureToken {
    const {
      length = 32,
      expiryHours = 1
    } = options;

    // Generate cryptographically secure random token
    const token = randomBytes(length).toString('hex');
    
    // Create hash for storage (never store raw tokens)
    const hashedToken = this.hashToken(token);
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    return {
      token,
      hashedToken,
      expiresAt,
      metadata: {
        createdAt: new Date(),
        purpose: 'password_reset',
        strength: 'high'
      }
    };
  }

  /**
   * Generate a secure token for account deletion confirmation
   */
  static generateAccountDeletionToken(): SecureToken {
    // Use UUID for account deletion tokens for better tracking
    const token = uuidv4();
    const hashedToken = this.hashToken(token);
    
    // Account deletion tokens expire in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return {
      token,
      hashedToken,
      expiresAt,
      metadata: {
        createdAt: new Date(),
        purpose: 'account_deletion',
        strength: 'maximum'
      }
    };
  }

  /**
   * Generate a secure token for email verification
   */
  static generateEmailVerificationToken(): SecureToken {
    const token = randomBytes(24).toString('base64url');
    const hashedToken = this.hashToken(token);
    
    // Email verification tokens expire in 48 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    return {
      token,
      hashedToken,
      expiresAt,
      metadata: {
        createdAt: new Date(),
        purpose: 'email_verification',
        strength: 'high'
      }
    };
  }

  /**
   * Generate a secure one-time token for sensitive operations
   */
  static generateOneTimeToken(purpose: string, expiryMinutes = 15): SecureToken {
    const token = randomBytes(20).toString('hex');
    const hashedToken = this.hashToken(token);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    return {
      token,
      hashedToken,
      expiresAt,
      metadata: {
        createdAt: new Date(),
        purpose,
        strength: 'maximum'
      }
    };
  }

  /**
   * Generate a human-readable token (for support cases, etc.)
   * Uses cryptographically secure randomBytes instead of Math.random
   */
  static generateReadableToken(length = 8): SecureToken {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    
    // Generate cryptographically secure random bytes
    const secureBytes = this.getSecureRandomBytes(length);
    
    for (let i = 0; i < length; i++) {
      const randomIndex = secureBytes[i] % chars.length;
      token += chars[randomIndex];
    }
    
    // Add hyphens for readability
    if (length >= 6) {
      token = token.match(/.{1,4}/g)?.join('-') || token;
    }
    
    const hashedToken = this.hashToken(token);
    
    // Readable tokens have shorter expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    return {
      token,
      hashedToken,
      expiresAt,
      metadata: {
        createdAt: new Date(),
        purpose: 'human_readable',
        strength: 'high' // Upgraded from 'medium' due to secure randomness
      }
    };
  }

  /**
   * Get cryptographically secure random bytes
   */
  private static getSecureRandomBytes(length: number): Uint8Array {
    return randomBytes(length);
  }

  /**
   * Hash a token for secure storage
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate a token against its hash
   */
  static validateToken(plainToken: string, hashedToken: string): boolean {
    const computedHash = this.hashToken(plainToken);
    
    // Use timing-safe comparison to prevent timing attacks
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const storedBuffer = Buffer.from(hashedToken, 'hex');
    
    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(computedBuffer, storedBuffer);
  }

  /**
   * Comprehensive token validation with expiry check
   */
  static validateTokenWithExpiry(
    plainToken: string, 
    hashedToken: string, 
    expiresAt: Date
  ): TokenValidationResult {
    const now = new Date();
    const isExpired = now > expiresAt;
    
    if (isExpired) {
      return {
        isValid: false,
        isExpired: true,
        reason: 'Token has expired'
      };
    }

    const isValid = this.validateToken(plainToken, hashedToken);
    
    if (!isValid) {
      return {
        isValid: false,
        isExpired: false,
        reason: 'Token is invalid'
      };
    }

    const remainingTimeMs = expiresAt.getTime() - now.getTime();
    
    return {
      isValid: true,
      isExpired: false,
      remainingTimeMs
    };
  }

  /**
   * Generate a secure random string for various purposes
   */
  static generateSecureRandomString(length = 16, options: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSpecialChars?: boolean;
  } = {}): string {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSpecialChars = false
    } = options;

    let chars = '';
    if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) chars += '0123456789';
    if (includeSpecialChars) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) {
      throw new Error('At least one character set must be enabled');
    }

    let result = '';
    const bytes = randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    
    return result;
  }

  /**
   * Calculate token strength based on entropy
   */
  static calculateTokenStrength(token: string): {
    strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    entropy: number;
    recommendations?: string[];
  } {
    const length = token.length;
    let charsetSize = 0;

    // Determine character set size
    if (/[a-z]/.test(token)) charsetSize += 26;
    if (/[A-Z]/.test(token)) charsetSize += 26;
    if (/[0-9]/.test(token)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(token)) charsetSize += 32; // Estimate for special chars

    // Calculate entropy: log2(charsetSize^length)
    const entropy = Math.log2(Math.pow(charsetSize, length));

    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    const recommendations: string[] = [];

    if (entropy < 40) {
      strength = 'weak';
      recommendations.push('Use a longer token (at least 16 characters)');
      recommendations.push('Include mixed case letters and numbers');
    } else if (entropy < 60) {
      strength = 'medium';
      recommendations.push('Consider using a longer token for sensitive operations');
    } else if (entropy < 80) {
      strength = 'strong';
    } else {
      strength = 'very_strong';
    }

    return { strength, entropy, recommendations: recommendations.length ? recommendations : undefined };
  }

  /**
   * Generate a time-based one-time password (TOTP) style token
   */
  static generateTOTPStyleToken(secret: string, timeStep = 30): string {
    const now = Math.floor(Date.now() / 1000);
    const timeCounter = Math.floor(now / timeStep);
    
    const hash = createHash('sha1')
      .update(secret + timeCounter.toString())
      .digest('hex');
    
    // Take last 4 bits as offset
    const offset = parseInt(hash.slice(-1), 16);
    
    // Extract 4 bytes starting at offset
    const code = parseInt(hash.substring(offset * 2, offset * 2 + 8), 16) & 0x7fffffff;
    
    // Return 6-digit code
    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Generate audit trail ID for tracking token usage
   */
  static generateAuditId(): string {
    return `audit_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }
}

export default TokenService;