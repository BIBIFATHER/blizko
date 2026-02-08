# SMOKE TESTS

## A. Parent
1. Login
2. Create parent request
3. Upload 1 document
4. Save
5. Open profile and verify request is visible

## B. Nanny
1. Login
2. Create nanny profile
3. Upload resume/document
4. Save
5. Open admin and verify profile appears

## C. Admin moderation
1. Set parent status to `in_review`
2. Reject with reason
3. Confirm reason visible in parent profile
4. Parent edits and resubmits
5. Confirm status changes back to `in_review`

## D. Notifications
1. Run `curl /api/notify-test`
2. Change status in admin
3. Verify user/admin email events are sent

## E. Technical
1. `npm run build`
2. Check console for critical errors
3. Verify API routes respond
