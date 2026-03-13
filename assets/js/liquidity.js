// liquidity.js - Cálculo de zonas de liquidez

class LiquidityAnalyzer {
    constructor() {
        this.zones = [];
        this.targetZone = null;
    }

    // Calcular zonas de liquidez basadas en datos de velas con volumen
    calculateZones(candles, currentPrice) {
        this.zones = [];
        if (candles.length < 50) return;

        // Detectar zonas de alta actividad/volumen
        const liquidityZones = this.findLiquidityZones(candles);

        // Agrupar niveles cercanos
        const levels = this.groupLevels(liquidityZones);

        // Calcular puntuación para cada zona
        this.zones = levels.map(level => ({
            price: level.price,
            strength: level.strength,
            type: level.type, // 'buy' o 'sell' basado en vela
            score: this.calculateScore(level, currentPrice, candles)
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
        const threshold = avgVolume * 1.5; // Velas con volumen > 1.5x promedio

        for (let i = 0; i < candles.length; i++) {
            if (candles[i].volume > threshold) {
                const price = candles[i].close; // Usar close como precio de actividad
                const type = candles[i].close > candles[i].open ? 'buy' : 'sell'; // Compra si cerró arriba, venta si abajo
                zones.push({ price, type, volume: candles[i].volume, index: i });
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
                    found = true;
                    break;
                }
            }
            if (!found) {
                groups.push({
                    price: swing.price,
                    type: swing.type,
                    strength: 1,
                    prices: [swing.price]
                });
            }
        });
        return groups;
    }

    calculateScore(level, currentPrice, candles) {
        let score = 0;

        // Cercanía al precio actual
        const distance = Math.abs(level.price - currentPrice) / currentPrice;
        score += (1 - distance) * 50; // Máximo 50 puntos por cercanía

        // Fuerza del nivel (repeticiones)
        score += level.strength * 10;

        // Volumen relativo (si disponible)
        // Aquí podríamos agregar lógica de volumen si estuviera disponible

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