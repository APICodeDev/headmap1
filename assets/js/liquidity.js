// liquidity.js - Cálculo de zonas de liquidez

class LiquidityAnalyzer {
    constructor() {
        this.zones = [];
        this.targetZone = null;
    }

    // Calcular zonas de liquidez basadas en datos de velas con volumen
    calculateZones(candles, currentPrice) {
        this.zones = [];
        if (candles.length < 10) return;

        // Detectar zonas basadas en máximos/mínimos significativos y volumen
        const liquidityZones = this.findLiquidityZones(candles);

        // Agrupar niveles cercanos
        const levels = this.groupLevels(liquidityZones);

        // Calcular puntuación para cada zona
        this.zones = levels.map(level => ({
            price: level.price,
            strength: level.strength,
            type: level.type, // 'buy' o 'sell' basado en máximo/mínimo
            score: this.calculateScore(level, currentPrice, candles),
            volume: level.totalVolume
        }));

        // Ordenar por puntuación
        this.zones.sort((a, b) => b.score - a.score);

        // Determinar zona objetivo
        this.calculateTargetZone(currentPrice, candles);
    }

    findLiquidityZones(candles) {
        const zones = [];
        const volumes = candles.map(c => c.volume);
        const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
        
        // Analizar últimos 50-100 candles para encontrar zonas relevantes
        const lookback = Math.min(100, candles.length);
        const recentCandles = candles.slice(-lookback);
        
        for (let i = 1; i < recentCandles.length - 1; i++) {
            const candle = recentCandles[i];
            const prevCandle = recentCandles[i - 1];
            const nextCandle = recentCandles[i + 1];
            
            // Detectar máximos locales (resistencia/zona de venta)
            if (candle.high > prevCandle.high && candle.high > nextCandle.high) {
                // Confirmar si hay volumen significativo
                const volumeRatio = candle.volume / avgVolume;
                if (volumeRatio >= 1.2) { // 20% más que promedio
                    zones.push({ 
                        price: candle.high, 
                        type: 'sell', 
                        volume: candle.volume,
                        high: candle.high,
                        low: candle.low,
                        totalVolume: candle.volume
                    });
                }
            }
            
            // Detectar mínimos locales (soporte/zona de compra)
            if (candle.low < prevCandle.low && candle.low < nextCandle.low) {
                const volumeRatio = candle.volume / avgVolume;
                if (volumeRatio >= 1.2) { // 20% más que promedio
                    zones.push({ 
                        price: candle.low, 
                        type: 'buy', 
                        volume: candle.volume,
                        high: candle.high,
                        low: candle.low,
                        totalVolume: candle.volume
                    });
                }
            }
        }
        
        // También considerar velas con volumen excepcionalmente alto
        const highVolumeThreshold = avgVolume * 2.0;
        for (let i = 0; i < recentCandles.length; i++) {
            if (recentCandles[i].volume > highVolumeThreshold) {
                const candle = recentCandles[i];
                const isBullish = candle.close > candle.open;
                
                // Para velas alcistas con alto volumen, el mínimo es zona de compra
                if (isBullish) {
                    zones.push({ 
                        price: candle.low, 
                        type: 'buy', 
                        volume: candle.volume,
                        high: candle.high,
                        low: candle.low,
                        totalVolume: candle.volume
                    });
                } else {
                    // Para velas bajistas con alto volumen, el máximo es zona de venta
                    zones.push({ 
                        price: candle.high, 
                        type: 'sell', 
                        volume: candle.volume,
                        high: candle.high,
                        low: candle.low,
                        totalVolume: candle.volume
                    });
                }
            }
        }
        
        return zones;
    }

    groupLevels(swings) {
        const groups = [];
        swings.forEach(swing => {
            let found = false;
            for (let group of groups) {
                if (Math.abs(group.price - swing.price) / group.price < 0.005) { // 0.5% tolerance
                    group.strength++;
                    group.prices.push(swing.price);
                    group.price = group.prices.reduce((a, b) => a + b) / group.prices.length;
                    group.totalVolume += swing.totalVolume || swing.volume; // Acumular volumen
                    found = true;
                    break;
                }
            }
            if (!found) {
                groups.push({
                    price: swing.price,
                    type: swing.type,
                    strength: 1,
                    prices: [swing.price],
                    totalVolume: swing.totalVolume || swing.volume
                });
            }
        });
        return groups;
    }

    calculateScore(level, currentPrice, candles) {
        let score = 0;

        // Cercanía al precio actual
        const distance = Math.abs(level.price - currentPrice) / currentPrice;
        score += (1 - Math.min(distance * 10, 1)) * 50; // Máximo 50 puntos por cercanía

        // Fuerza del nivel (repeticiones)
        score += level.strength * 10;

        // Volumen relativo
        if (level.totalVolume) {
            const volumes = candles.map(c => c.volume);
            const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
            const volumeRatio = level.totalVolume / avgVolume;
            score += Math.min(volumeRatio * 5, 20); // Máximo 20 puntos por volumen
        }

        // Compatibilidad con tendencia
        const trend = this.calculateTrend(candles);
        if ((trend === 'bullish' && level.type === 'buy') ||
            (trend === 'bearish' && level.type === 'sell')) {
            score += 20;
        }

        return score;
    }

    calculateTrend(candles) {
        const recent = candles.slice(-50); // Más velas para mejor análisis
        const startPrice = recent[0].close;
        const endPrice = recent[recent.length - 1].close;
        const change = (endPrice - startPrice) / startPrice;

        if (change > 0.005) return 'bullish'; // 0.5% up
        if (change < -0.005) return 'bearish'; // 0.5% down
        return 'neutral';
    }

    calculateTargetZone(currentPrice, candles) {
        const trend = this.calculateTrend(candles);
        let candidates;

        if (trend === 'bullish') {
            candidates = this.zones.filter(z => z.price > currentPrice && z.type === 'sell');
        } else if (trend === 'bearish') {
            candidates = this.zones.filter(z => z.price < currentPrice && z.type === 'buy');
        } else {
            candidates = this.zones.filter(z => Math.abs(z.price - currentPrice) / currentPrice < 0.02);
        }

        this.targetZone = candidates.length > 0 ? candidates[0] : this.zones[0];
    }

    getZones() {
        return this.zones;
    }

    getTargetZone() {
        return this.targetZone;
    }
}

// Instancia global
const liquidityAnalyzer = new LiquidityAnalyzer();