# V11-G acceptance checklist
- All five service navigation links resolve to their corresponding Next.js routes.
- Ride2Go never presents a mock fare or invented driver assignment.
- Ride2Go trip list reads GET /api/ride2go/trips with same-origin credentials.
- Signed-out, backend-unavailable, loading, empty and populated states are distinct.
- Existing property search and role-based access flows remain unchanged.
- Verify on mobile and desktop; backend integration and real payment remain separate gates.
