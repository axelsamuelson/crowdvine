# Documentation Index

This directory contains all project documentation organized by category.

## 📁 Directory Structure

### /migrations
Database migration guides and instructions for major schema changes.
- MIGRATION_INSTRUCTIONS.md - General migration procedures
- MIGRATION_040_GUIDE.md through MIGRATION_048_GUIDE.md - Specific migration guides
- CRITICAL_MIGRATION_038_INSTRUCTIONS.md - Critical migration instructions

### /deployment
Deployment procedures, checklists, and deployment-related documentation.
- DEPLOYMENT_TRIGGER.md - Trigger deployment documentation
- POST_DEPLOYMENT_CHECKLIST.md - Post-deployment verification checklist

### /debugging
Debugging guides for troubleshooting specific issues.
- DEBUG_COMPLETION.md - General debugging procedures
- INVITATION_DEBUG_GUIDE.md - Invitation system debugging
- ONBOARDING_DEBUG_GUIDE.md - Onboarding process debugging

### /setup
Setup instructions for configuring various services and features.
- ACCESS_REQUEST_SETUP.md - Access request system setup
- STRIPE_LIVE_MODE_CHECKLIST.md - Stripe live mode configuration
- STRIPE_LIVE_QUICK_START.md - Quick start for Stripe
- SUPABASE_SETUP_GUIDE.md - Supabase configuration
- SUPABASE_VERIFICATION_GUIDE.md - Supabase verification process
- SETUPINTENT_ALTERNATIVES.md - Payment setup alternatives

### /fixes
Fix guides for resolving specific issues.
- AUDIT_FIXES_SUMMARY.md - Summary of audit fixes
- CRITICAL_FIX_044.md - Critical fix #044
- Email fixes (EMAIL_DELIVERABILITY_FIX.md, EMAIL_FIX_GUIDE.md, etc.)
- FIX_INVITATION_URL_SPACES.md - Invitation URL fix
- PASSWORD_RESET_FIX_GUIDE.md - Password reset troubleshooting
- QUICK_FIX_*.md - Quick fixes for various issues

### /audits
System audit reports and reviews.
- AUDIT_FIXES_SUMMARY.md - Summary of audit fixes
- PAYMENT_SYSTEM_AUDIT_REPORT.md - Payment system audit
- PLATFORM_AUDIT_2025.md - Platform audit from 2025

### /features
Feature documentation and implementation guides.
- MEMBERSHIP_*.md - Membership system documentation
- REWARDS_SYSTEM_GUIDE.md - Rewards system documentation
- PRODUCER_FILTERING_GUIDE.md - Producer filtering features
- PALLET_DATA_FLOW_ANALYSIS.md - Pallet data flow
- WINE_IMAGES_FEATURE.md - Wine images feature
- IP_AWARD_VERIFICATION_GUIDE.md - IP award verification

### /performance
Performance optimization documentation.
- PERFORMANCE_OPTIMIZATIONS_COMPLETE.md - Completed optimizations
- FINAL_PERFORMANCE_SUMMARY.md - Final performance summary
- OPTIMIZATION_COMPLETE.md - Optimization completion notes

### /issues
Known issues and their resolutions.
- SWEDISH_CARD_ISSUES.md - Swedish card payment issues

### /sql
SQL scripts, queries, and database utilities.
- check_invitation_data.sql - Invitation data verification
- DEBUG_LEVEL_DOWNGRADE.sql - Debug level downgrade script
- DELETE_AXELRIB_USER.sql - User deletion script
- fix_incorrect_pallet_completion.sql - Pallet completion fix
- fix_missing_memberships.sql - Membership fix script
- verify_invitation_codes.sql - Invitation code verification

### Root level files
- IMAGE_MANAGEMENT.md - Image management documentation
- SENDGRID_SETUP.md - SendGrid email service setup
- VALIDATION_SYSTEM_COMPLETE.md - Validation system documentation
- WORKING_STATE_SNAPSHOT.md - Working state snapshot

## Contributing

When adding new documentation:
1. Place it in the appropriate category directory
2. Follow existing naming conventions
3. Update this README if adding a new category
