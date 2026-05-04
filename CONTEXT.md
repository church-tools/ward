# Ward Tools

Ward Tools sends user-facing auth emails for account setup and access recovery.

## Language

**Auth email**:
A user-facing email that helps a person complete account setup or regain access.
_Avoid_: system email, notification email

**Confirmation email**:
An auth email that confirms an email address before access is enabled.
_Avoid_: verify email, activation email

**Invitation email**:
An auth email that invites someone to join Ward Tools through a shared link.
_Avoid_: invite email, onboarding email

**Password reset email**:
An auth email that lets a person set a new password after requesting a reset.
_Avoid_: reset link email

## Relationships

- An **Auth email** has one purpose: confirmation, invitation, or password reset.
- A **Confirmation email**, **Invitation email**, or **Password reset email** each contains one action link.

## Example dialogue

> **Dev:** "Is this a Confirmation email or an Invitation email?"
> **Domain expert:** "Use Confirmation email when the person is finishing setup for an existing account, and Invitation email when they are joining from a shared invite link."
