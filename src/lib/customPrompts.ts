import { dbRef, set, get, update, remove } from './firebase';
import { getDatabase, ref, child } from 'firebase/database';

export interface CustomLibrary {
    id: string;
    name: string;
    passwordHash?: string; // Simple hash for editing protection
    createdAt: number;
    updatedAt: number;
    prompts: string[];
    playCount: number;
}

// Simple hash function (not cryptographic, just for basic protection)
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Generate a random library code
export function generateLibraryCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evitamos caracteres confusos
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Create a new custom library
export async function createLibrary(
    name: string,
    prompts: string[],
    password?: string
): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
        const code = generateLibraryCode();
        const library: CustomLibrary = {
            id: code,
            name: name.trim(),
            passwordHash: password ? simpleHash(password) : undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            prompts: prompts.filter(p => p.trim().length > 0),
            playCount: 0
        };

        await set(dbRef(`libraries/${code}`), library);

        // Save to localStorage for easy access
        saveLibraryToLocal(code, name);

        return { success: true, code };
    } catch (error) {
        console.error('Error creating library:', error);
        return { success: false, error: 'Error al crear la biblioteca' };
    }
}

// Get a library by code
export async function getLibrary(code: string): Promise<CustomLibrary | null> {
    try {
        const snapshot = await get(dbRef(`libraries/${code.toUpperCase()}`));
        if (snapshot.exists()) {
            return snapshot.val() as CustomLibrary;
        }
        return null;
    } catch (error) {
        console.error('Error getting library:', error);
        return null;
    }
}

// Update a library (requires password if set)
export async function updateLibrary(
    code: string,
    updates: { name?: string; prompts?: string[] },
    password?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const library = await getLibrary(code);
        if (!library) {
            return { success: false, error: 'Biblioteca no encontrada' };
        }

        // Check password if library is protected
        if (library.passwordHash) {
            if (!password || simpleHash(password) !== library.passwordHash) {
                return { success: false, error: 'Contraseña incorrecta' };
            }
        }

        const updateData: any = { updatedAt: Date.now() };
        if (updates.name) updateData.name = updates.name.trim();
        if (updates.prompts) updateData.prompts = updates.prompts.filter(p => p.trim().length > 0);

        await update(dbRef(`libraries/${code.toUpperCase()}`), updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating library:', error);
        return { success: false, error: 'Error al actualizar la biblioteca' };
    }
}

// Increment play count
export async function incrementPlayCount(code: string): Promise<void> {
    try {
        const library = await getLibrary(code);
        if (library) {
            await update(dbRef(`libraries/${code.toUpperCase()}`), {
                playCount: (library.playCount || 0) + 1
            });
        }
    } catch (error) {
        console.error('Error incrementing play count:', error);
    }
}

// Delete a library (requires password)
export async function deleteLibrary(
    code: string,
    password?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const library = await getLibrary(code);
        if (!library) {
            return { success: false, error: 'Biblioteca no encontrada' };
        }

        if (library.passwordHash) {
            if (!password || simpleHash(password) !== library.passwordHash) {
                return { success: false, error: 'Contraseña incorrecta' };
            }
        }

        await remove(dbRef(`libraries/${code.toUpperCase()}`));
        removeLibraryFromLocal(code);
        return { success: true };
    } catch (error) {
        console.error('Error deleting library:', error);
        return { success: false, error: 'Error al eliminar la biblioteca' };
    }
}

// Local storage helpers
const LOCAL_STORAGE_KEY = 'quiplash_my_libraries';

interface LocalLibraryRef {
    code: string;
    name: string;
    addedAt: number;
}

export function getLocalLibraries(): LocalLibraryRef[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function saveLibraryToLocal(code: string, name: string): void {
    if (typeof window === 'undefined') return;
    try {
        const libraries = getLocalLibraries().filter(l => l.code !== code.toUpperCase());
        libraries.unshift({ code: code.toUpperCase(), name, addedAt: Date.now() });
        // Keep only the last 10 libraries
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(libraries.slice(0, 10)));
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

export function removeLibraryFromLocal(code: string): void {
    if (typeof window === 'undefined') return;
    try {
        const libraries = getLocalLibraries().filter(l => l.code !== code.toUpperCase());
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(libraries));
    } catch (error) {
        console.error('Error removing from local storage:', error);
    }
}

// Verify password for a library
export async function verifyLibraryPassword(code: string, password: string): Promise<boolean> {
    const library = await getLibrary(code);
    if (!library) return false;
    if (!library.passwordHash) return true; // No password required
    return simpleHash(password) === library.passwordHash;
}
