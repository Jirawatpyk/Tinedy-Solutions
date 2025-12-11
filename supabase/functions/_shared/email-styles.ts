/**
 * Email Template Styles Constants
 *
 * Shared styling constants for email templates
 * ใช้ร่วมกันทุก edge functions ที่ส่ง email
 */

// Brand Colors
export const EMAIL_COLORS = {
  // Primary brand color (Indigo-600)
  primary: '#4F46E5',
  primaryHover: '#4338CA',

  // Success color (Green-500)
  success: '#10b981',
  successBg: '#D1FAE5',
  successText: '#065F46',

  // Warning color (Yellow-500)
  warning: '#f59e0b',
  warningBg: '#FEF3C7',
  warningText: '#92400E',

  // Danger color (Red-500)
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  dangerText: '#991B1B',

  // Neutral colors
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Background colors
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgTertiary: '#f3f4f6',

  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
}

// Typography
export const EMAIL_FONTS = {
  primary: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  heading: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
}

// Spacing (in pixels)
export const EMAIL_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
}

// Border radius
export const EMAIL_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
}

/**
 * Generate base email styles CSS
 * ใช้สำหรับ <style> tag ใน email template
 */
export function getBaseEmailStyles(): string {
  return `
    body {
      font-family: ${EMAIL_FONTS.primary};
      line-height: 1.6;
      color: ${EMAIL_COLORS.text};
      background-color: ${EMAIL_COLORS.bgSecondary};
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      padding: ${EMAIL_SPACING.lg};
    }
    .email-card {
      background-color: ${EMAIL_COLORS.bgPrimary};
      border-radius: ${EMAIL_RADIUS.lg};
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .email-header {
      background: linear-gradient(135deg, ${EMAIL_COLORS.primary} 0%, ${EMAIL_COLORS.primaryHover} 100%);
      padding: ${EMAIL_SPACING.xl};
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: ${EMAIL_SPACING.xl};
    }
    .email-footer {
      background-color: ${EMAIL_COLORS.bgTertiary};
      padding: ${EMAIL_SPACING.lg};
      text-align: center;
      border-top: 1px solid ${EMAIL_COLORS.border};
    }
    .btn-primary {
      display: inline-block;
      background-color: ${EMAIL_COLORS.primary};
      color: #ffffff;
      padding: 12px 24px;
      border-radius: ${EMAIL_RADIUS.md};
      text-decoration: none;
      font-weight: 600;
    }
    .btn-success {
      display: inline-block;
      background-color: ${EMAIL_COLORS.success};
      color: #ffffff;
      padding: 12px 24px;
      border-radius: ${EMAIL_RADIUS.md};
      text-decoration: none;
      font-weight: 600;
    }
    .info-box {
      background-color: ${EMAIL_COLORS.bgSecondary};
      border: 1px solid ${EMAIL_COLORS.border};
      border-radius: ${EMAIL_RADIUS.md};
      padding: ${EMAIL_SPACING.md};
      margin: ${EMAIL_SPACING.md} 0;
    }
    .success-box {
      background-color: ${EMAIL_COLORS.successBg};
      border: 1px solid ${EMAIL_COLORS.success};
      border-radius: ${EMAIL_RADIUS.md};
      padding: ${EMAIL_SPACING.md};
      color: ${EMAIL_COLORS.successText};
    }
    .warning-box {
      background-color: ${EMAIL_COLORS.warningBg};
      border: 1px solid ${EMAIL_COLORS.warning};
      border-radius: ${EMAIL_RADIUS.md};
      padding: ${EMAIL_SPACING.md};
      color: ${EMAIL_COLORS.warningText};
    }
    .text-muted {
      color: ${EMAIL_COLORS.textMuted};
      font-size: 14px;
    }
    .text-secondary {
      color: ${EMAIL_COLORS.textSecondary};
    }
  `
}

/**
 * Business info section styles
 * Note: business-name ใช้ text-align: center เพื่อให้ชื่อธุรกิจอยู่กลาง
 * ส่วน contact items (phone, address) ใช้ flex-start เพื่อชิดซ้าย
 */
export function getBusinessInfoStyles(): string {
  return `
    .business-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: left;
    }
    .business-name {
      font-size: 18px;
      font-weight: 700;
      color: ${EMAIL_COLORS.text};
      margin-bottom: 12px;
      text-align: center;
    }
    .contact-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      font-size: 14px;
      color: ${EMAIL_COLORS.textSecondary};
      margin: 4px 0;
    }
  `
}
