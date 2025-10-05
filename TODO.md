# Bingo25 Backend Integration TODO

## Completed
- [x] Create Vercel API endpoints (create-game, join-game, game/[gameCode])
- [x] Integrate Redis for persistent game state storage
- [x] Update frontend to use new API-based gameService instead of mock service
- [x] Implement polling for real-time updates

## Remaining
- [ ] Set up Redis instance (e.g., Upstash) and configure REDIS_URL environment variable in Vercel
- [ ] Test multiplayer functionality with Redis backend
- [ ] Deploy updated code to Vercel
- [ ] Verify loading issue is resolved when playing with a friend
