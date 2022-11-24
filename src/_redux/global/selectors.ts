import { AppState } from '@_redux/_root';
import { createSelector } from '@reduxjs/toolkit';

// workspace selector
const globalGetWorkspace = (state: AppState) => state.present.global.workspace
export const globalGetWorkspaceSelector = createSelector(globalGetWorkspace, (workspace) => workspace)

// currentFile selector
const globalGetCurrentFile = (state: AppState) => state.present.global.currentFile
export const globalGetCurrentFileSelector = createSelector(globalGetCurrentFile, (currentFile) => currentFile)

// pending selector
const globalGetPending = (state: AppState) => state.present.global.pending
export const globalGetPendingSelector = createSelector(globalGetPending, (pending) => pending)

// globalError selector
const globalGetError = (state: AppState) => state.present.global.error
export const globalGetErrorSelector = createSelector(globalGetError, (error) => error)