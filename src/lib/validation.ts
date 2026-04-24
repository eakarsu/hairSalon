// Client-side form validation utilities

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  message?: string;
}

export interface ValidationErrors {
  [field: string]: string;
}

export function validateField(value: string, rules: ValidationRule): string | null {
  if (rules.required && !value.trim()) {
    return rules.message || 'This field is required';
  }
  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }
  if (rules.maxLength && value.length > rules.maxLength) {
    return `Must be at most ${rules.maxLength} characters`;
  }
  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message || 'Invalid format';
  }
  if (rules.custom) {
    return rules.custom(value);
  }
  return null;
}

export function validateForm(
  data: Record<string, string>,
  rules: Record<string, ValidationRule>
): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const [field, rule] of Object.entries(rules)) {
    const error = validateField(data[field] || '', rule);
    if (error) {
      errors[field] = error;
    }
  }
  return errors;
}

export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  phone: {
    required: true,
    pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
    message: 'Please enter a valid phone number',
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Name must be between 2 and 100 characters',
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      const checks = [];
      if (!/[A-Z]/.test(value)) checks.push('uppercase letter');
      if (!/[a-z]/.test(value)) checks.push('lowercase letter');
      if (!/[0-9]/.test(value)) checks.push('number');
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) checks.push('special character');
      if (checks.length > 0) return `Password needs: ${checks.join(', ')}`;
      return null;
    },
  },
};

// Password strength calculation
export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  score = Math.min(score, 4);

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2e7d32'];

  return { score, label: labels[score], color: colors[score] };
}
