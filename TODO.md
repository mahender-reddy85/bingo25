# TODO: Remove Duplicates and Correct Errors

## Information Gathered
- **Duplicates Identified**:
  - `constants.ts` exists in root and `backend/src/` with identical content.
  - `types.ts` exists in root and `backend/src/` with identical content.
- **Errors Identified**:
  - Unresolved merge conflict in `App.tsx` with git markers (<<<<<<< HEAD, =======, >>>>>>> 2e99f3e).
  - Incorrect import extensions in backend files: imports use `.js` instead of no extension for TypeScript files.
  - Backend files import from local duplicates instead of shared root files.

## Plan
- [x] Delete duplicate `backend/src/constants.ts`
- [x] Delete duplicate `backend/src/types.ts`
- [x] Update imports in `backend/src/gameService.ts`:
  - Change `from './types.js'` to `from '../../types'`
  - Change `from './constants.js'` to `from '../../constants'`
- [x] Update imports in `backend/src/server.ts`:
  - Change `from './gameService.js'` to `from './gameService'`
  - Change `from './types.js'` to `from '../../types'`
- [x] Resolve merge conflict in `App.tsx`:
  - Choose the `realGameService` import and async `handleStartGame` version.
- [x] Read remaining files to check for additional errors.
- [x] Run the project to verify no runtime errors.

## Followup Steps
- Test frontend and backend compilation.
- Run backend server and frontend to ensure functionality.
- Check for any linter errors or TypeScript issues.
