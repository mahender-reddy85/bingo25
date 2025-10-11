# TODO: Player-Specific Reveal Colors and Winning Highlights

## Task Description:
After clicking "I'm Ready", players start clicking numbers. The color must be different for both players (for reveals), and if a complete row/column/diagonal completes, change the color so user can know (winning pattern highlight).

## Steps Completed:

1. **Add calledBy to SyncState**
   - Added `calledBy: Record<number, string>` to types.js SyncState.
   - Initialized `calledBy: {}` in create-game.ts and join-game.ts.

2. **Update Backend for calledBy**
   - In api/game/[gameCode].ts, handleRevealNumber: add `calledBy[nextNumber] = playerId`.
   - In handleNextRound: reset `calledBy: {}`.

3. **Update Frontend for calledBy**
   - Pass `calledBy={syncState.calledBy}` and `ownPlayerId={playerId}` to BingoGrid in GameScreen.tsx.

4. **Update BingoGrid for Player-Specific Colors**
   - Added calledBy and ownPlayerId props to BingoGridProps and GridCell.
   - In GridCell, for isCalled cells: if calledBy[number] === ownPlayerId, use blue background/border/text, else orange.
   - Winning cells remain green.

## Progress:
- [x] Add calledBy to SyncState
- [x] Update Backend for calledBy
- [x] Update Frontend for calledBy
- [x] Update BingoGrid for Player-Specific Colors

All steps completed. The feature is ready for testing.
