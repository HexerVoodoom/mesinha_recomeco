Create a complete mobile application based on the attached UI Kit and wireframe references.

Project name: Shared Couple Lists App

Goal:
Build a minimalist, romantic, adult couple-focused shared list app with real-time synchronization between two users.

Use the attached UI Kit as the visual source of truth:
- Tiffany Blue as primary color
- Soft neutral backgrounds
- Rounded corners
- Subtle shadows
- Outline icons (thin stroke)
- Clean, premium, not childish
- No heavy illustrations
- Minimal decorative elements in header

General Rules:
- Mobile-first (iPhone 14 / 390x844 frame)
- Use 8px spacing system
- Consistent corner radius (12–16px)
- No checkboxes in list rows
- Metadata inline before title (Creator • Date)
- Actions (Edit/Delete/Done) must stay inside dropdown expansion
- "Feito" must be a separated section header, not a checkbox state
- FAB must be contextual and fixed bottom-right
- Header must be taller and allow decorative space
- Add small settings icon in header (top right, subtle)

-----------------------------------
SCREENS TO CREATE
-----------------------------------

1) MAIN LIST SCREEN (Home = list)

Header:
- Taller header area
- Decorative subtle background (soft gradient or paper texture)
- Small settings icon top-right (outline)
- Horizontal icon-only category navigation below header
- Active category highlighted with Tiffany underline
- Horizontal swipe between categories

List:
- Each row:
    Inline small metadata text: "Amanda • 02 Abr"
    Item title
    Chevron on right
- No checkbox

Expanded item (accordion):
    Comment input
    Text buttons: Edit, Delete, Mark as Done
    Soft card background

Section:
- "Feito" header divider
- Completed items below (faded style)
- No checkbox

FAB:
- Circular
- Tiffany Blue
- White plus icon
- Floating bottom-right
- Contextual to active category

-----------------------------------

2) ADD ITEM – Bottom Sheet Modal

Bottom sheet aligned to bottom
Rounded top corners
Background dimmed
Close (X) centered above modal, outside modal area

Fields:
- Title (required)
- Comment (optional)
- Optional: Add reminder toggle
- Save (Primary)
- Cancel (Text button)

-----------------------------------

3) DATE SPECIAL ITEM TYPE

Extra fields:
- Event date picker
- Upload photo
- Polaroid preview style thumbnail
- Reminder option (shared alarm)

Expanded view:
- Larger polaroid image
- Caption
- Creator metadata

-----------------------------------

4) FILTER MODAL (Bottom Sheet)

Fields:
- Status (All / Pending / Done)
- Created by (You / Partner / Both)
- Date range
- Sort (Newest / Oldest)

Buttons:
- Apply (Primary)
- Clear (Text)

-----------------------------------

5) SETTINGS SCREEN

- Couple name (e.g. You & Amanda)
- Theme color selector (Tiffany default)
- Notification preferences
- Backup/export option
- Leave couple space
- App version

-----------------------------------

FUNCTIONAL REQUIREMENTS (for developer handoff layer)

The UI must consider:
- Real-time sync
- Two-user shared environment
- Inline metadata
- Section separation
- Swipe between categories
- Optimistic UI updates
- Push notifications support
- Reminder triggers for both users
- Offline support

-----------------------------------

INTERACTION DETAILS

- Accordion expand animation 200ms ease
- Bottom sheet spring animation
- Swipe gesture for category change
- Smooth list reordering when item marked done
- Subtle haptic feedback on important actions

-----------------------------------

DESIGN TONE

- Premium minimal
- Soft romantic adult
- Tiffany Blue primary accent
- Neutral backgrounds
- No childish cartoon visuals
- Subtle emotional warmth