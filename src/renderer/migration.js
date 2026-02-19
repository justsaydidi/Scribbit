/**
 * One-time data migration script for Scribbit.
 * Moves legacy inkwell_* database keys to scribbit_* equivalents.
 */

(async function migrateData() {
    try {
        // Ensure scribbit namespace exists
        if (!window.scribbit || !window.scribbit.db) return;

        const migratedKey = 'scribbit_migrated';
        const isMigrated = await window.scribbit.db.get(migratedKey);

        if (isMigrated) {
            console.log('[Migration] Already migrated.');
            return;
        }

        console.log('[Migration] Starting data migration...');
        const allData = await window.scribbit.db.getAll();

        // Handle common keys that were prefixed with inkwell_
        const keysToMigrate = [
            { old: 'inkwell_api_key', new: 'scribbit_api_key' },
            { old: 'inkwell_ai_provider', new: 'scribbit_ai_provider' }
        ];

        let changed = false;

        // 1. Migrate specific prefixed keys
        for (const { old: oldKey, new: newKey } of keysToMigrate) {
            if (allData[oldKey] !== undefined) {
                console.log(`[Migration] Moving ${oldKey} to ${newKey}`);
                await window.scribbit.db.set(newKey, allData[oldKey]);
                await window.scribbit.db.delete(oldKey);
                changed = true;
            }
        }

        // 2. Scan for any other inkwell_ prefixed keys dynamically
        for (const key of Object.keys(allData)) {
            if (key.startsWith('inkwell_') && !keysToMigrate.some(m => m.old === key)) {
                const newKey = key.replace('inkwell_', 'scribbit_');
                console.log(`[Migration] Moving dynamic key ${key} to ${newKey}`);
                await window.scribbit.db.set(newKey, allData[key]);
                await window.scribbit.db.delete(key);
                changed = true;
            }
        }

        // Mark as migrated
        await window.scribbit.db.set(migratedKey, true);
        console.log('[Migration] Migration complete.');

        if (changed) {
            console.log('[Migration] Data changes detected, reloading or continuing...');
        }
    } catch (err) {
        console.error('[Migration] Migration failed:', err);
    }
})();
