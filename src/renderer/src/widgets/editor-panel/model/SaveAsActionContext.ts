import { createContext } from 'react';
import type { ConsoleFrame } from '@common/types';

/** Keeps code as a new action in a frame, named: the page opens the Actions view on it. */
export type SaveAsAction = (code: string, frame: ConsoleFrame | undefined, name: string) => void;

/** How the editor panel's pages (the Component page) keep code as an action: the page's, given to the panel. */
export const SaveAsActionContext = createContext<SaveAsAction | null>(null);
