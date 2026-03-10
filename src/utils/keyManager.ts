export class KeyManager {
    private keys: string[] = [];
    private currentIndex: number = 0;

    constructor() {
        this.loadKeys();
    }

    private loadKeys() {
        // 1. Primary keys
        if (process.env.OPENROUTER_API_KEY) this.keys.push(process.env.OPENROUTER_API_KEY);
        if (process.env.API_KEY) this.keys.push(process.env.API_KEY);

        // 2. Secondary keys (e.g., _2, _3)
        // You can loop or just check specific ones known to be used
        if (process.env.OPENROUTER_API_KEY_2) this.keys.push(process.env.OPENROUTER_API_KEY_2);
        if (process.env.OPENROUTER_API_KEY_3) this.keys.push(process.env.OPENROUTER_API_KEY_3);
        if (process.env.OPENROUTER_API_KEY_4) this.keys.push(process.env.OPENROUTER_API_KEY_4);
        if (process.env.GEMINI_API_KEY) this.keys.push(process.env.GEMINI_API_KEY);

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
