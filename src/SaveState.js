export default class SaveState {
    static save(data) {
        localStorage.setItem('gameState', JSON.stringify(data));
    }

    static load() {
        const data = localStorage.getItem('gameState');
        return data ? JSON.parse(data) : null;
    }

    static clear() {
        localStorage.removeItem('gameState');
    }
}