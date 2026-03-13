// api.js - Manejo de APIs gratuitas

class CryptoAPI {
    constructor() {
        this.baseURL = 'https://api.binance.com/api/v3';
        this.symbols = [];
        this.currentSymbol = 'XRPUSDT';
    }

    // Obtener lista de símbolos disponibles
    async getSymbols() {
        try {
            const response = await fetch(`${this.baseURL}/exchangeInfo`);
            const data = await response.json();
            this.symbols = data.symbols
                .filter(symbol => symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING')
                .map(symbol => symbol.symbol);
            return this.symbols;
        } catch (error) {
            console.error('Error obteniendo símbolos:', error);
            return [];
        }
    }

    // Obtener datos de velas OHLCV para las últimas 24 horas (3m interval)
    async getCandles(symbol, interval = '3m', limit = 480) {
        try {
            const response = await fetch(`${this.baseURL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
            if (!response.ok) {
                console.error(`Error ${response.status} obteniendo velas for ${symbol}`);
                return [];
            }
            const data = await response.json();
            return data.map(candle => ({
                time: candle[0] / 1000, // timestamp en segundos
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
            }));
        } catch (error) {
            console.error('Error obteniendo velas:', error);
            return [];
        }
    }

    // Obtener precio actual
    async getCurrentPrice(symbol) {
        try {
            const response = await fetch(`${this.baseURL}/ticker/price?symbol=${symbol}`);
            if (!response.ok) {
                console.error(`Error ${response.status} obteniendo precio para ${symbol}`);
                return null;
            }
            const data = await response.json();
            console.log(`Precio para ${symbol}:`, data.price);
            return parseFloat(data.price);
        } catch (error) {
            console.error('Error obteniendo precio:', error);
            return null;
        }
    }

    // Obtener cambio 24h
    async get24hChange(symbol) {
        try {
            const response = await fetch(`${this.baseURL}/ticker/24hr?symbol=${symbol}`);
            if (!response.ok) {
                console.error(`Error ${response.status} obteniendo cambio 24h para ${symbol}`);
                return null;
            }
            const data = await response.json();
            return {
                priceChange: parseFloat(data.priceChange),
                priceChangePercent: parseFloat(data.priceChangePercent),
                highPrice: parseFloat(data.highPrice),
                lowPrice: parseFloat(data.lowPrice),
                volume: parseFloat(data.volume)
            };
        } catch (error) {
            console.error('Error obteniendo cambio 24h:', error);
            return null;
        }
    }

    // Buscar símbolos por query
    searchSymbols(query) {
        const upperQuery = query.toUpperCase();
        return this.symbols.filter(symbol => symbol.includes(upperQuery)).slice(0, 10);
    }
}

// Instancia global
const api = new CryptoAPI();