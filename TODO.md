# Bingo25 Backend Integration TODO

## Completed
- [x] Create Vercel API endpoints (create-game, join-game, game/[gameCode])
- [x] Integrate Redis for persistent game state storage using @upstash/redis
- [x] Update frontend to use new API-based gameService instead of mock service
- [x] Implement polling for real-time updates

## Remaining
- [ ] Set up Upstash Redis instance and configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables in Vercel
- [ ] Test multiplayer functionality with Redis backend
- [ ] Deploy updated code to Vercel
- [ ] Verify loading issue is resolved when playing with a friend
