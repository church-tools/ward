# Ward Tools

Ward Tools supports ward operations like account access and meeting planning.

## Language

### Auth emails

**Auth email**:
A user-facing email that helps a person complete account setup or regain access.
_Avoid_: system email, notification email

**Confirmation email**:
An auth email that confirms an email address before access is enabled.
_Avoid_: verify email, activation email

**Invitation email**:
An auth email that invites someone to join Ward Tools through a shared link.
_Avoid_: invite email, onboarding email

**Join link**:
A shared unit link that lets someone request access; only one active link exists per unit at a time.
_Avoid_: invite link, invitation link, join URL

**Approval required**:
A unit setting that requires approval before access is granted through a join link.
_Avoid_: confirmation required, approval needed, pending approval

**Password reset email**:
An auth email that lets a person set a new password after requesting a reset.
_Avoid_: reset link email

### Meetings

**Canvas**:
A shared drawing surface that can be attached to other objects.
_Avoid_: board, whiteboard

**Agenda canvas**:
A Canvas attached to an Agenda.
_Avoid_: agenda board, meeting canvas

**Agenda editor**:
A person with edit permissions for an Agenda and its canvas.
_Avoid_: board admin, agenda owner

## Relationships

- An **Auth email** has one purpose: confirmation, invitation, or password reset.
- A **Confirmation email**, **Invitation email**, or **Password reset email** each contains one action link.
- A **Unit** has at most one active **Join link** at a time.
- A **Unit** has one **Approval required** setting.
- An **Agenda** has at most one **Agenda canvas**.
- An **Agenda canvas** belongs to exactly one **Agenda**.
- An **Agenda canvas** is editable by **Agenda editors**.

## Example dialogue

> **Dev:** "Is this a Confirmation email or an Invitation email?"
> **Domain expert:** "Use Confirmation email when the person is finishing setup for an existing account, and Invitation email when they are joining from a shared invite link."

> **Dev:** "Is the Agenda canvas shared or per person?"
> **Domain expert:** "Shared — one canvas per Agenda for the whole unit."
