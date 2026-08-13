export class KeyManager {
    private keys: string[] = [];
    private currentIndex: number = 0;

    constructor() {
        this.loadKeys();
    }

    private loadKeys() {
        const env = (import.meta as any).env || {};
        
        // Load OpenRouter keys ONLY (since this manager is used for OpenRouter requests)
        if (env.VITE_OPENROUTER_API_KEY) this.keys.push(env.VITE_OPENROUTER_API_KEY);
        if (env.VITE_OPENROUTER_API_KEY_2) this.keys.push(env.VITE_OPENROUTER_API_KEY_2);
        if (env.VITE_OPENROUTER_API_KEY_3) this.keys.push(env.VITE_OPENROUTER_API_KEY_3);
        if (env.VITE_OPENROUTER_API_KEY_4) this.keys.push(env.VITE_OPENROUTER_API_KEY_4);

        // Remove duplicates and empty strings
        this.keys = [...new Set(this.keys.filter(k => !!k))];

        if (this.keys.length === 0) {
            console.warn("[KeyManager] No API keys found in environment variables!");
        } else {
            console.log(`[KeyManager] Loaded ${this.keys.length} API keys.`);
        }
    }

    public getNextKey(): string {
        if (this.keys.length === 0) {
            throw new Error("No API keys available.");
        }

        const key = this.keys[this.currentIndex];
        // Rotate index
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;

        if (this.keys.length > 1) {
            console.log(`[KeyManager] Rotated to key index ${this.currentIndex}`);
        }

        return key;
    }

    public getKeyCount(): number {
        return this.keys.length;
    }
}

export const keyManager = new KeyManager();
